# Mettre Paddle en service

Le code est en place : le webhook traite `subscription.created`,
`subscription.updated`, `subscription.canceled` et `transaction.completed`,
avec vérification de signature. L'annulation, la reprise et les factures PDF
ont leurs routes.

Ce qui reste n'est pas du code : c'est la **validation du compte vendeur** par
Paddle, plus deux réglages dans leur tableau de bord qui bloquent le paiement
tant qu'ils ne sont pas faits.

---

## L'ordre compte : le domaine d'abord

Paddle vérifie **le site à l'adresse que tu déclares**. Deux conséquences :

1. Si tu soumets `nexora-mu-henna.vercel.app` puis déménages vers
   `nexoracoding.com`, la vérification est à refaire — et elle prend plusieurs
   jours ouvrés.
2. Paddle.js refuse d'ouvrir le checkout depuis un domaine absent de la liste
   **Approved domains** (_Checkout → Website approval_). Le bouton « Payer »
   semble alors ne rien faire, sans message d'erreur exploitable.

**Achète le domaine, branche-le, puis soumets à Paddle.** Pas l'inverse.

Paddle n'est en revanche **pas un préalable à la publication des extensions** :
le palier gratuit fonctionne sans lui. Tu peux publier sur npm, JetBrains et
VS Code pendant que la validation suit son cours.

---

## Ce que Paddle examine

Le site couvre déjà l'essentiel :

| Exigence                      | Page         | État                              |
| ----------------------------- | ------------ | --------------------------------- |
| Description claire du produit | `/`, `/docs` | ✅                                |
| Prix visibles avec devise     | `/pricing`   | ✅                                |
| Conditions générales          | `/terms`     | ✅                                |
| Remboursement et résiliation  | `/terms`     | ✅                                |
| Confidentialité               | `/privacy`   | ✅                                |
| Moyen de contact              | `/contact`   | ✅                                |
| Identité du vendeur (KYC)     | —            | à fournir dans le tableau de bord |

Le KYC est la seule pièce qui ne dépend pas du site : pièce d'identité et
justificatif d'adresse, à téléverser dans _Seller settings → Verification_.
C'est ce qui prend le plus de temps, donc à lancer en premier.

---

## Les huit variables d'environnement

À définir dans Vercel (_Settings → Environment Variables_) et en local dans
`.env.local`.

| Variable                              | Où la trouver dans Paddle                            | Secret  |
| ------------------------------------- | ---------------------------------------------------- | ------- |
| `PADDLE_ENV`                          | `sandbox` ou `production`                            | non     |
| `PADDLE_API_KEY`                      | Developer tools → Authentication                     | **oui** |
| `PADDLE_WEBHOOK_SECRET`               | Developer tools → Notifications → ton endpoint       | **oui** |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`     | Developer tools → Authentication → Client-side token | non     |
| `NEXT_PUBLIC_PADDLE_PRICE_STARTER`    | Catalogue → Produits → prix du plan Starter          | non     |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO`        | idem, plan Pro                                       | non     |
| `NEXT_PUBLIC_PADDLE_PRICE_BUSINESS`   | idem, plan Business                                  | non     |
| `NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE` | idem, plan Enterprise                                | non     |

Les identifiants de prix sont publics par construction : le checkout Paddle
s'ouvre côté navigateur avec l'ID du prix. Ce ne sont pas des secrets, juste
des références de catalogue.

Le jeton client dit à lui seul dans quel environnement tu es : `test_…` pointe
vers le sandbox, `live_…` vers la production. `isPaddleSandbox()` s'appuie
là-dessus.

---

## L'endpoint webhook

À déclarer dans _Developer tools → Notifications_ :

```
https://nexoracoding.com/api/webhooks/paddle
```

Abonne-le aux quatre événements que le code traite — `subscription.created`,
`subscription.updated`, `subscription.canceled`, `transaction.completed`.
Le secret affiché à la création est `PADDLE_WEBHOOK_SECRET` : il n'est montré
qu'une fois.

Sans cette valeur, la vérification de signature rejette tout, et un abonnement
payé ne sera jamais activé côté Nexora. C'est la panne la plus coûteuse de
l'intégration, parce qu'elle est silencieuse pour l'acheteur : il paie et
n'obtient rien.

---

## Vérifier avant de passer en production

Le sandbox accepte les cartes de test — rien n'est débité.

1. `PADDLE_ENV=sandbox` et un jeton client `test_…`
2. Ajoute ton domaine aux **Approved domains** du sandbox
3. Souscris un plan sur `/pricing` avec la carte de test `4242 4242 4242 4242`
4. Vérifie que le webhook a bien été reçu (_Notifications → Logs_) et que le
   plan de l'utilisateur a changé en base

Ce n'est qu'une fois ce parcours complet que `PADDLE_ENV=production` a du sens.

---

## Plans de test à 1 € et 2 €

Retirés. Ils s'affichaient sur la page de prix avec un bouton actif alors
qu'aucun identifiant de prix Paddle ne leur correspondait — le checkout ne
pouvait qu'échouer, et un forfait visible mais non achetable est un motif de
refus en revue.

La migration `007-remove-test-plans.sql` les supprime de la base. Elle reste à
exécuter dans le SQL Editor de Supabase.
