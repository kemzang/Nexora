# Requêtes SQL d'exploitation

Les opérations courantes qui ne passent par aucune interface : offrir un
forfait, comprendre une facture, diagnostiquer un compte. À exécuter dans
Supabase → SQL Editor.

**Deux règles valables partout.**

Le plan et la consommation sont **mis en cache 5 minutes** côté proxy
(`plan:<userId>`, `usage:<userId>`). Après toute modification d'abonnement,
l'utilisateur ne verra le changement qu'au bout de ce délai. Inutile de
chercher un bug avant.

Le quota réel ne se lit **pas** dans `user_subscriptions.tokens_remaining`.
Cette colonne est un reste d'une ancienne approche, encore `NOT NULL` mais
plus consultée. Le quota est la somme de `usage_sessions.tokens_total` sur
la fenêtre de facturation courante.

---

## Abonnements

### Offrir un forfait sans paiement

Pour un testeur, un partenaire, un compte de démonstration. Contourne Paddle
entièrement.

```sql
-- 1. Désactiver l'abonnement actif existant.
--    Indispensable : le proxy lit l'abonnement actif avec maybeSingle(),
--    donc deux lignes actives le feraient échouer.
update user_subscriptions
set status = 'cancelled', updated_at = now()
where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
  and status = 'active';

-- 2. Créer le nouveau, ancré sur aujourd'hui.
insert into user_subscriptions
  (user_id, plan_id, status, current_period_start, current_period_end, tokens_remaining)
select u.id, p.id, 'active', now(), now() + interval '1 month', p.tokens_per_month
from auth.users u, subscription_plans p
where u.email = 'ADRESSE@example.com' and p.slug = 'starter';
```

Seul `'starter'` est à changer pour un autre forfait (`pro`, `business`,
`enterprise`) — `tokens_remaining` suit automatiquement.

`current_period_start = now()` n'est pas décoratif : c'est l'ancre de la
fenêtre de quota. Sans lui, la consommation passée serait décomptée du
nouveau forfait.

Si l'insertion renvoie `0 rows`, l'adresse n'existe pas dans `auth.users` —
la personne doit d'abord créer son compte.

### Prolonger un forfait existant

```sql
update user_subscriptions
set current_period_end = current_period_end + interval '1 month',
    updated_at = now()
where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
  and status = 'active';
```

Prolonge sans remettre la consommation à zéro — la fenêtre s'allonge. Pour
repartir de zéro, avancer aussi `current_period_start` à `now()`.

### Révoquer un accès

```sql
update user_subscriptions
set status = 'cancelled', updated_at = now()
where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
  and status = 'active';
```

La personne retombe sur le forfait gratuit à la prochaine requête (après le
cache de 5 minutes).

### Vérifier l'état d'un compte

```sql
select p.slug, s.status, s.current_period_start, s.current_period_end,
       s.current_period_end < now() as expire
from user_subscriptions s
join subscription_plans p on p.id = s.plan_id
join auth.users u on u.id = s.user_id
where u.email = 'ADRESSE@example.com'
order by s.created_at desc;
```

Une seule ligne doit être `active` et non expirée. Plusieurs lignes actives
font échouer le proxy.

---

## Consommation

### Ce qu'une personne a consommé ce mois-ci

```sql
select
  count(*) as requetes,
  sum(tokens_input) as entree,
  sum(tokens_output) as sortie,
  sum(tokens_total) as credits,
  sum((metadata->>'cachedInputTokens')::bigint) as jetons_relus
from usage_sessions
where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
  and started_at >= (
    select current_period_start from user_subscriptions
    where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
      and status = 'active' limit 1
  );
```

`credits` est ce qui décompte le quota — des jetons pondérés par le coût du
modèle, pas des jetons bruts. `jetons_relus` est la part servie depuis le
cache du fournisseur, facturée à 0,1× (Anthropic, DeepSeek) ou 0,25×
(Google).

### Le cache mord-il vraiment ?

La vérification qui compte après une vraie boucle d'agent. Sur une
conversation qui s'allonge, `jetons_relus` doit grimper dès la deuxième
requête.

```sql
select started_at,
       metadata->>'model' as modele,
       tokens_input as entree,
       (metadata->>'cachedInputTokens')::bigint as relus,
       tokens_total as credits
from usage_sessions
where user_id = (select id from auth.users where email = 'ADRESSE@example.com')
order by started_at desc
limit 20;
```

Si `relus` reste à zéro sur plusieurs lignes consécutives d'une même
conversation, le préfixe est invalidé quelque part et la mise en cache ne
sert à rien. Chercher ce qui change entre deux requêtes — un horodatage, un
identifiant, un ordre de clés non déterministe.

### Les plus gros consommateurs

```sql
select u.email, p.slug as forfait,
       sum(s.tokens_total) as credits,
       count(*) as requetes
from usage_sessions s
join auth.users u on u.id = s.user_id
left join user_subscriptions sub on sub.user_id = s.user_id and sub.status = 'active'
left join subscription_plans p on p.id = sub.plan_id
where s.started_at >= now() - interval '30 days'
group by u.email, p.slug
order by credits desc
limit 20;
```

À croiser avec le plafond du forfait : quelqu'un qui frôle sa limite tous
les mois est un candidat à la montée en gamme — ou le signe que le forfait
est mal calibré.

### Répartition par modèle

```sql
select metadata->>'model' as modele,
       count(*) as requetes,
       sum(tokens_total) as credits,
       round(avg(tokens_total)) as moyenne
from usage_sessions
where started_at >= now() - interval '30 days'
group by 1 order by credits desc;
```

Dit où part l'argent. Un modèle cher très sollicité en mode automatique
justifie de revoir l'arbitrage de `selectBestModel`.

---

## Équipes

### Créer une organisation

Une organisation naît d'une vente, pas d'un bouton dans l'application.

```sql
insert into organizations (name, slug, owner_id, seats, credits_per_seat, status)
select 'Nom de la société', 'nom-societe',
       u.id, 10, 4000000, 'active'
from auth.users u where u.email = 'PROPRIETAIRE@example.com'
returning id, slug;
```

`credits_per_seat` × `seats` donne le pot commun. 4 000 000 correspond au
forfait Starter par personne.

Ajouter ensuite le propriétaire comme membre — il n'y est pas
automatiquement :

```sql
insert into organization_members (org_id, user_id, role)
select o.id, o.owner_id, 'owner'
from organizations o where o.slug = 'nom-societe';
```

### Voir la consommation d'une équipe

```sql
select o.name, o.seats, o.credits_per_seat,
       o.seats * o.credits_per_seat as plafond,
       coalesce(sum(s.tokens_total), 0) as consomme
from organizations o
left join organization_members m on m.org_id = o.id
left join usage_sessions s on s.user_id = m.user_id
  and s.started_at >= date_trunc('month', now())
where o.slug = 'nom-societe'
group by o.id, o.name, o.seats, o.credits_per_seat;
```

---

## Diagnostic

### Un utilisateur dit qu'il est bloqué

Dans cet ordre : a-t-il un abonnement valide, a-t-il épuisé son quota, sa
clé est-elle active.

```sql
with cible as (select id from auth.users where email = 'ADRESSE@example.com')
select
  (select p.slug from user_subscriptions s
     join subscription_plans p on p.id = s.plan_id
    where s.user_id = (select id from cible) and s.status = 'active'
      and s.current_period_end > now() limit 1) as forfait_actif,
  (select sum(tokens_total) from usage_sessions
    where user_id = (select id from cible)
      and started_at >= date_trunc('month', now())) as credits_consommes,
  (select count(*) from api_keys
    where user_id = (select id from cible) and is_active) as cles_actives;
```

`forfait_actif` vide → il est sur le gratuit, vérifier son abonnement.
`cles_actives` à zéro → son jeton `nxr_` a été révoqué, d'où un 401 ; il
doit relancer `nexora login`.

### Demandes Enterprise reçues

```sql
select created_at, company_name, contact_name, work_email, developers, timeline
from enterprise_leads
order by created_at desc limit 50;
```

### Supprimer une demande de test

```sql
delete from enterprise_leads where company_name ilike '%TEST%';
```

À lancer d'abord en `select` pour voir ce qui part.
