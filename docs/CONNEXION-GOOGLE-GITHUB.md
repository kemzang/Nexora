# Connexion avec Google et GitHub

Le code est déployé. Les boutons n'apparaissent que lorsque leur
fournisseur est **actif** : tant que les deux variables ci-dessous valent
autre chose que `true`, la page de connexion reste exactement comme
aujourd'hui.

C'est voulu. Montrer un bouton qui répondra « provider is not enabled »
est pire que de ne pas le montrer : on essaie, on échoue, et on doute du
reste du produit.

Quatre étapes par fournisseur, et ils sont indépendants — tu peux
n'activer que Google.

---

## L'adresse de retour, la même pour les deux

```
https://dgrrkeugniijfhagmplm.supabase.co/auth/v1/callback
```

C'est **Supabase** qui reçoit la réponse du fournisseur, pas ton site. Une
erreur fréquente est d'y mettre `nexoracoding.com` : l'authentification
échoue alors avec « redirect_uri_mismatch ».

---

## Google

### 1. Créer l'identifiant OAuth

[console.cloud.google.com](https://console.cloud.google.com) → crée un
projet (ou prends-en un existant) → **APIs & Services** →
**Credentials** → **Create credentials** → **OAuth client ID**.

S'il demande d'abord de configurer l'écran de consentement :

- **User type** : External
- **App name** : Nexora
- **User support email** : ton adresse
- **Authorized domains** : `nexoracoding.com`
- **Developer contact** : ton adresse

Puis, pour l'identifiant lui-même :

| Champ | Valeur |
|---|---|
| Application type | **Web application** |
| Name | Nexora |
| Authorized JavaScript origins | `https://nexoracoding.com` |
| Authorized redirect URIs | `https://dgrrkeugniijfhagmplm.supabase.co/auth/v1/callback` |

Google affiche un **Client ID** et un **Client secret**.

> ⚠️ Tant que l'écran de consentement est en mode **Testing**, seuls les
> comptes que tu ajoutes explicitement comme testeurs peuvent se
> connecter. Pour ouvrir à tes clients, il faut le passer en
> **Production** — c'est un bouton, et pour les permissions de base
> (email, profil) Google ne demande pas de vérification.

### 2. Déclarer chez Supabase

[supabase.com/dashboard](https://supabase.com/dashboard) → ton projet →
**Authentication** → **Providers** → **Google** → active-le, colle le
Client ID et le Client secret → **Save**.

---

## GitHub

### 1. Créer l'application OAuth

[github.com/settings/developers](https://github.com/settings/developers)
→ **OAuth Apps** → **New OAuth App**.

| Champ | Valeur |
|---|---|
| Application name | Nexora |
| Homepage URL | `https://nexoracoding.com` |
| Authorization callback URL | `https://dgrrkeugniijfhagmplm.supabase.co/auth/v1/callback` |

Après création, clique **Generate a new client secret**.

> GitHub ne montre le secret qu'une fois.

### 2. Déclarer chez Supabase

**Authentication** → **Providers** → **GitHub** → active-le, colle les
deux valeurs → **Save**.

> ⚠️ Un compte GitHub peut n'avoir **aucune adresse publique**. Supabase
> demande le scope `user:email`, ce qu'il fait par défaut, et récupère
> alors l'adresse privée vérifiée. Si un utilisateur n'a vraiment aucune
> adresse vérifiée sur GitHub, la connexion échouera de son côté — c'est
> une situation rare et il n'y a rien à faire chez nous.

---

## Les URL de redirection autorisées, chez Supabase

**Authentication** → **URL Configuration** :

- **Site URL** : `https://nexoracoding.com`
- **Redirect URLs** : ajoute ces deux lignes

```
https://nexoracoding.com/**
http://localhost:3000/**
```

**Ne saute pas cette étape.** Le retour se fait sur la page d'où l'on est
parti, paramètres compris — `/auth/login?callback=…&state=…` — et une
liste trop étroite ferait atterrir tout le monde sur l'accueil. La
connexion depuis un éditeur casserait silencieusement : l'utilisateur
serait bien connecté, et VS Code attendrait un jeton qui n'arriverait
jamais.

---

## Activer les boutons, dans Vercel

Settings → Environment Variables, environnement **Production** :

| Nom | Valeur | Type |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` | Config |
| `NEXT_PUBLIC_GITHUB_AUTH_ENABLED` | `true` | Config |

Les deux sont **Config** et non Secret : elles commencent par
`NEXT_PUBLIC_`, donc elles partent dans le navigateur de chaque visiteur.
Il n'y a rien à y cacher — et jamais une clé.

N'ajoute que celles dont le fournisseur est configuré. Puis redéploie,
sinon elles ne sont pas lues.

---

## Éprouver

1. Ouvre `https://nexoracoding.com/auth/login` en navigation privée. Les
   boutons doivent être là.
2. **Continue with Google** → choisis un compte → tu dois revenir
   connecté sur le tableau de bord.
3. Vérifie dans Supabase → **Authentication** → **Users** que le compte
   existe, avec `email_confirmed_at` renseigné.
4. **Le test qui compte** : depuis VS Code, lance la connexion, puis
   choisis Google sur la page qui s'ouvre. Tu dois revenir sur l'écran
   « Signed in » avec le lien vers l'éditeur — **pas** sur le tableau de
   bord. Si tu atterris sur le tableau de bord, la liste des Redirect
   URLs de Supabase est trop étroite.

---

## Ce qu'il faut savoir ensuite

**Le prénom et le nom.** Le formulaire les demande ; un fournisseur les
donne sous un autre nom. Google renseigne `full_name`, GitHub `name` ou
seulement un pseudo. Nos écrans lisent `first_name` et `last_name` : un
compte créé par ce chemin affichera donc ses initiales comme « ? » tant
qu'on n'aura pas rempli ces champs. Ce n'est pas bloquant, et ça se
traite à part.

**La même adresse par deux chemins.** Quelqu'un inscrit par mot de passe
qui revient par Google sur la même adresse : Supabase rattache les deux
au même compte si l'adresse est vérifiée des deux côtés. C'est le
comportement par défaut, et c'est le bon.

**La limite de comptes par machine** ne change pas : elle est posée à
l'échange du code côté éditeur, pas à l'inscription.
