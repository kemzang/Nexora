# Rappels avant prélèvement

> Écrit pour le jour où tu reprends ce projet sans rien te rappeler de la
> conversation qui l'a produit. Tout ce dont tu as besoin est ici.

## Pourquoi

Un abonnement se renouvelait en silence : l'utilisateur découvrait le débit
sur son relevé. C'est le genre de surprise qui fait résilier **et** demander
un remboursement, même quand le service plaisait — parce que le grief ne
porte pas sur le montant, mais sur le fait de ne pas avoir eu le choix.

Une tâche quotidienne envoie donc un e-mail au moins une semaine avant
l'échéance.

## Les deux messages

Ils disent le contraire l'un de l'autre, donc ils ne partagent que l'habillage.

| Situation | Message | Lien proposé |
|---|---|---|
| Renouvellement actif | « Ton plan Pro se renouvelle le 16 novembre, 12 $ seront prélevés » | arrêter le renouvellement |
| Renouvellement coupé (`cancel_at_period_end`) | « Ton accès se termine le 16 novembre, rien ne sera prélevé » | reprendre l'abonnement |

Dans les deux cas le lien vers le tableau de bord est présent. Un rappel qui
annonce un débit sans dire comment l'arrêter n'est pas un service rendu,
c'est un avis de passage.

**Les plans gratuits ne reçoivent rien** : rien n'est prélevé et rien
n'expire, l'annonce ne ferait qu'inquiéter.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `lib/renewalReminders.ts` | la fenêtre, le choix du message, la composition. Pur, donc testable sans base ni réseau. |
| `lib/renewalReminders.test.ts` | 13 tests sur la seule partie où une erreur se paie en messages envoyés à tort, ou en silence là où on avait promis un avertissement. |
| `app/api/cron/renewal-reminders/route.ts` | la lecture en base, l'envoi, la trace anti-doublon. |
| `supabase/migrations/016-rappels-echeance.sql` | la table `subscription_reminders`. |
| `vercel.json` | la planification (`0 9 * * *`, une fois par jour). |

## Mise en route — deux étapes

### 1. Appliquer la migration

Exécute `supabase/migrations/016-rappels-echeance.sql` dans Supabase
(Dashboard → SQL Editor). Elle crée `subscription_reminders`, qui ne sert
qu'à ne pas envoyer deux fois le même message.

### 2. Créer `CRON_SECRET`

**Tu l'inventes.** Ce n'est pas une clé fournie par un service : c'est un mot
de passe au hasard que tu choisis, que tu donnes à Vercel, et que Vercel te
renvoie à chaque appel. La route compare les deux.

```bash
openssl rand -hex 32
```

Copie la sortie, puis dans Vercel : ton projet → **Settings** →
**Environment Variables** → **Add New**

- Key : `CRON_SECRET`
- Value : la chaîne générée
- Environments : **Production** au minimum

Puis **redéploie**. Les variables d'environnement ne sont lues qu'au
déploiement : tant que tu n'as pas redéployé, la route continue de refuser.

Elle ne vit qu'à cet endroit — jamais dans le dépôt, jamais dans une
conversation.

## Vérifier que ça tourne

Vercel → ton projet → onglet **Cron Jobs**. Il liste chaque exécution et son
code de retour.

Une réponse normale ressemble à :

```json
{ "examines": 3, "envoyes": 1, "ignores": 2, "echecs": 0 }
```

- `examines` — abonnements actifs dont l'échéance tombe dans les 8 jours
- `envoyes` — rappels réellement partis
- `ignores` — déjà prévenus pour cette échéance, ou plan gratuit, ou compte supprimé
- `echecs` — Resend a refusé l'envoi

Un `200` avec `"examines": 0` est **normal** s'il n'y a aucune échéance
proche. Ça veut dire que la tâche tourne.

Pour la déclencher à la main (remplace par ta vraie valeur, ne la colle
nulle part ailleurs) :

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://nexoracoding.com/api/cron/renewal-reminders
```

## Quand rien ne part

| Symptôme | Cause probable |
|---|---|
| `401 Unauthorized` dans l'historique Vercel | `CRON_SECRET` absente, ou posée mais **pas redéployée** |
| Aucune exécution listée du tout | `vercel.json` absent du déploiement, ou le projet n'est pas sur Vercel |
| `500 Query failed` | la migration 016 n'a pas été appliquée |
| `examines` > 0 mais `envoyes` = 0 en permanence | tout est déjà en base dans `subscription_reminders` — vérifie-la |
| `echecs` > 0 | `RESEND_API_KEY` invalide, ou domaine non vérifié chez Resend |
| Le rappel part mais trop tard | voir « la fenêtre » ci-dessous |

Requête pour voir ce qui est déjà parti :

```sql
select subscription_id, period_end, kind, sent_at
from subscription_reminders
order by sent_at desc
limit 20;
```

## Deux décisions à ne pas défaire sans comprendre

### La fenêtre de 8 jours, et non la date J-7

La tâche balaie **tout ce qui échoit dans les 8 prochains jours**, pas
seulement les échéances tombant exactement à J-7.

Raison : la [documentation Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)
est explicite — sur le plan Hobby l'heure d'invocation n'est pas garantie
(une tâche à 9 h part entre 9 h 00 et 9 h 59), et surtout **Vercel ne
réessaie jamais une invocation qui échoue**. Un rappel calé sur une date
exacte serait donc perdu définitivement le jour où la tâche ne part pas.
Avec une fenêtre, le lendemain rattrape.

Le 8ᵉ jour est une marge, pas un arrondi : sans lui, une échéance à
7,4 jours n'entrait pas dans la fenêtre aujourd'hui, et demain elle n'était
plus qu'à 6,4 jours — le rappel partait donc à J-6, en retard sur la semaine
promise à l'utilisateur.

Si tu réduis la fenêtre à la date exacte, les doublons disparaissent mais les
rappels manqués deviennent silencieux et définitifs. C'est le mauvais sens.

### La trace est écrite AVANT l'envoi

La contrainte `unique (subscription_id, period_end, kind)` fait de cette
insertion le verrou : si elle échoue, le rappel est déjà parti et on passe.

Dans l'autre ordre — envoyer puis noter — un envoi réussi suivi d'une
insertion échouée renverrait le message **chaque jour jusqu'à l'échéance**.

Le prix de ce choix : une panne de Resend juste après l'insertion consomme le
rappel sans l'envoyer. C'est le moindre mal. Rater un avertissement est
désagréable ; en envoyer huit fait résilier.

### Pourquoi la clé porte `period_end`

`period_end` est une copie figée de `current_period_end` au moment de
l'envoi. Ce n'est pas de la dénormalisation paresseuse : c'est elle qui
distingue deux échéances du même abonnement. Quand le renouvellement a lieu,
la ligne d'abonnement avance vers une nouvelle date de fin, donc une nouvelle
clé, donc un nouveau rappel. Sans ça, un abonnement n'aurait été prévenu
qu'une seule fois dans sa vie.

Un abonnement peut aussi recevoir les **deux** sortes dans la même période,
si l'utilisateur résilie après avoir reçu l'annonce de prélèvement. C'est
voulu : les deux informations sont vraies à leur moment.

## Contraintes du plan Hobby

- Une seule exécution par jour. Une expression plus fréquente
  (`0 * * * *`, `*/30 * * * *`) **fait échouer le déploiement**.
- Heure non garantie à l'intérieur de l'heure choisie.
- Aucune reprise après échec.

Les trois sont déjà absorbées par la fenêtre. Si tu passes un jour sur Pro,
rien n'est à changer ici.

## Résilier son propre abonnement

Sans lien avec la tâche, mais c'est la question qui revient : **Dashboard →
la carte de l'abonnement → « Cancel automatic renewal »**, puis « Yes, stop
it ». L'accès est conservé jusqu'à la date affichée. Code dans
`app/dashboard/sections/SubscriptionSection.tsx`, API dans
`app/api/payments/paddle/cancel-subscription/route.ts`.
