# Support : répondre depuis le panneau, recevoir les réponses

Le code est déployé. Il reste quatre choses à poser à la main, dans cet
ordre. Tant qu'elles ne sont pas faites, le panneau fonctionne mais
l'envoi échoue et les réponses des clients continuent d'arriver dans la
boîte `support@` comme avant.

---

## 1. Les deux migrations, dans Supabase

SQL Editor → coller, exécuter, dans l'ordre :

1. `supabase/migrations/018-reponses-support.sql` — la table du fil
2. `supabase/migrations/019-reponses-entrantes.sql` — le sens entrant

La 019 suppose la 018 : elle ajoute des colonnes à sa table.

**Vérifier :**

```sql
select column_name from information_schema.columns
 where table_name = 'support_ticket_replies'
 order by ordinal_position;
```

Attendu : `id`, `ticket_id`, `author`, `body`, `email_sent`, `email_error`,
`created_at`, `direction`, `raw_body`, `provider_message_id`.

À ce stade, **répondre depuis le panneau marche déjà**. Les points 2 à 4
ne servent qu'à recevoir les réponses.

---

## 2. Le sous-domaine de réception, chez Resend puis Porkbun

### Pourquoi un sous-domaine

`nexoracoding.com` porte déjà les MX de la redirection Porkbun :

```
10 fwd1.porkbun.com.
20 fwd2.porkbun.com.
```

C'est ce qui amène `support@nexoracoding.com` dans ta boîte. Poser les MX
de Resend à côté les ferait concourir — Resend l'écrit noir sur blanc :
sans la priorité la plus basse, la remise devient imprévisible. On ne
touche donc pas à l'apex.

**`reply.nexoracoding.com`** est un sous-domaine neuf, sans MX. Rien de
ce qui existe n'est perturbé, et si ça se passe mal il suffit de
supprimer l'enregistrement.

### Chez Resend

Domains → `nexoracoding.com` est déjà vérifié pour l'envoi. Ajouter un
**nouveau domaine** `reply.nexoracoding.com`, activer **Enable
Receiving**, et laisser **Enable Sending** désactivé — on n'envoie rien
depuis ce sous-domaine.

Resend affiche alors un enregistrement MX. **Copie la valeur qu'il te
donne**, ne la devine pas : elle dépend de la région du compte.

### Chez Porkbun

DNS → ajouter :

| Type | Host | Réponse | Priorité |
|---|---|---|---|
| MX | `reply` | *la valeur donnée par Resend* | 10 |

Puis revenir chez Resend et cliquer « I've added the record ». La
propagation prend de quelques minutes à une heure.

**Vérifier :**

```bash
dig +short MX reply.nexoracoding.com
```

Et que l'apex n'a pas bougé :

```bash
dig +short MX nexoracoding.com
```

Doit toujours rendre les deux `fwd*.porkbun.com`.

---

## 3. Le webhook, chez Resend

Webhooks → Add Webhook :

- **Endpoint** : `https://www.nexoracoding.com/api/webhooks/resend-inbound`
- **Event** : `email.received`, et seulement celui-là

Resend affiche un **signing secret** après création. C'est la variable
du point 4.

---

## 4. Deux variables, dans Vercel

Settings → Environment Variables, environnement **Production** :

| Nom | Valeur |
|---|---|
| `RESEND_WEBHOOK_SECRET` | le secret du point 3 |
| `SUPPORT_REPLY_DOMAIN` | `reply.nexoracoding.com` |

Puis redéployer (Deployments → le dernier → Redeploy), sinon les
variables ne sont pas lues.

**L'ordre compte.** `SUPPORT_REPLY_DOMAIN` est ce qui fait écrire
`nx-7f3k2@reply.nexoracoding.com` dans le `Reply-To`. Le poser avant que
le MX ne réponde enverrait les clients vers un domaine qui ne reçoit
rien : leurs réponses rebondiraient, et nous croirions simplement qu'ils
n'ont pas répondu. Tant que la variable est absente, on continue d'écrire
`support@nexoracoding.com`, qui marche.

---

## Éprouver la chaîne

1. Créer un ticket depuis `/support` avec une adresse à toi.
2. Dans le tableau de bord → Support, répondre au ticket.
3. Vérifier la réception du courriel. Son `Reply-To` doit être
   `nx-xxxxx@reply.nexoracoding.com`.
4. **Répondre à ce courriel.**
5. Rafraîchir le panneau : la réponse doit apparaître dans le fil, en
   bleu, et le ticket doit être repassé à **Open**.

Si l'étape 5 ne donne rien, regarder dans l'ordre :

- Resend → Webhooks → l'historique des livraisons. Un 400 signifie que
  le secret ne correspond pas ; un 500, que le contenu n'a pas pu être
  relu — Resend réessaiera tout seul.
- Vercel → Logs, filtrer sur `[inbound]`.
- La table `support_tickets` : si un ticket neuf de catégorie `other`
  est apparu avec `context->>'source' = 'inbound email'`, le message est
  bien arrivé mais la référence n'a pas été reconnue. Rien n'est perdu,
  c'est le filet.

---

## Ce qu'il faut savoir une fois que ça tourne

**Les courriels reçus comptent dans le quota Resend.** Chacun vaut un
envoi. Sur le palier gratuit : 100 par jour et 3 000 par mois, envois et
réceptions confondus.

**Resend n'archive que trente jours.** Le fil en base est la seule copie
durable — c'est la raison pour laquelle le webhook rend 500 plutôt que
d'acquitter quand il n'arrive pas à relire le contenu.

**Toute adresse du sous-domaine arrive au même endroit.** Un robot qui
écrit à `contact@reply.nexoracoding.com` déclenchera le webhook et créera
un ticket. Si ça devient bruyant, le filtre se pose dans la route, sur la
forme de la partie locale.

**Les pièces jointes ne sont pas récupérées.** Resend les garde de son
côté et le fil n'en montre rien. Si un client envoie une capture d'écran,
tu verras son message mais pas l'image. À faire si le besoin se présente.
