-- =====================================================================
-- Organisations : equipes, sieges et credits mutualises
--
-- Une organisation nait d'une vente Enterprise, jamais d'un bouton dans
-- l'application. C'est volontaire : une organisation sans abonnement n'a
-- aucun sens, et laisser n'importe qui en creer ouvre un contournement
-- evident des quotas — il suffirait d'en ouvrir plusieurs.
--
-- Un utilisateur n'appartient qu'a UNE organisation (index unique sur
-- user_id). Sans cette regle, « de quel pot viennent les credits que je
-- consomme ? » n'a pas de reponse, et le rapport par membre ne veut plus
-- rien dire. C'est aussi ce que font les offres comparables.
-- =====================================================================

create table if not exists organizations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  name              text    not null,
  slug              text    not null unique,
  owner_id          uuid    not null references auth.users(id) on delete restrict,

  -- facturation
  seats             int     not null default 1 check (seats > 0),
  -- Credits par siege, mutualises : 10 sieges = 10 x cette valeur dans un
  -- pot commun. L'exposition totale est la meme qu'en quota individuel,
  -- le pot ne fait que redistribuer a l'interieur d'un plafond deja vendu.
  credits_per_seat  bigint  not null default 40000000 check (credits_per_seat >= 0),
  status            text    not null default 'active'
                      check (status in ('active','suspended','cancelled')),

  -- Debut de la periode de facturation. Sert de borne au calcul de
  -- consommation : l'organisation a son propre cycle, independant de la date
  -- d'inscription de chaque membre.
  period_start      timestamptz not null default now(),

  -- SSO : un utilisateur dont l'adresse se termine par l'un de ces domaines
  -- rejoint l'organisation a sa premiere connexion. L'enregistrement de
  -- l'IdP lui-meme se fait cote Supabase, par client ; cette colonne est la
  -- correspondance domaine -> organisation, qui manque sinon.
  sso_domains       text[]  not null default '{}',
  sso_default_role  text    not null default 'member'
                      check (sso_default_role in ('admin','member')),

  -- Trace vers la demande commerciale d'origine, pour relier le compte au
  -- dossier sans recherche manuelle.
  lead_id           uuid
);

create index if not exists organizations_owner_idx on organizations(owner_id);

-- Recherche par domaine SSO a chaque connexion : sans index, c'est un
-- balayage complet de la table a chaque fois.
create index if not exists organizations_sso_domains_idx
  on organizations using gin (sso_domains);

create table if not exists organization_members (
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member'
                check (role in ('owner','admin','member')),
  joined_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Un utilisateur, une organisation. Cf. l'en-tete du fichier.
create unique index if not exists organization_members_user_unique
  on organization_members(user_id);

create table if not exists organization_invites (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  org_id      uuid not null references organizations(id) on delete cascade,
  -- L'invite n'a pas forcement de compte : on garde l'adresse, pas un
  -- user_id. C'est le piege classique de ce genre de table.
  email       text not null,
  role        text not null default 'member'
                check (role in ('admin','member')),
  token       text not null unique,
  invited_by  uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

create index if not exists organization_invites_org_idx on organization_invites(org_id);
create index if not exists organization_invites_email_idx on organization_invites(lower(email));

-- Une seule invitation vivante par adresse et par organisation : reinviter
-- quelqu'un doit remplacer l'invitation, pas en empiler une deuxieme.
create unique index if not exists organization_invites_pending_unique
  on organization_invites(org_id, lower(email))
  where accepted_at is null;

-- ---------------------------------------------------------------------
-- Consommation mutualisee
--
-- Somme des credits de tous les membres depuis le debut de la periode de
-- l'organisation. Ecrit en SQL plutot qu'en TypeScript parce que la route
-- du proxy l'appelle sur le chemin critique : un aller-retour, pas un par
-- membre.
-- ---------------------------------------------------------------------
create or replace function organization_usage(p_org_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  -- COALESCE(tokens_total, tokens_input) : meme regle que get_monthly_usage,
  -- les lignes anciennes n'ont pas tokens_total.
  select coalesce(sum(coalesce(u.tokens_total, u.tokens_input, 0)), 0)::bigint
    from usage_sessions u
    join organization_members m on m.user_id = u.user_id
    join organizations o on o.id = m.org_id
   where m.org_id = p_org_id
     and u.started_at >= o.period_start
     -- SECURITY DEFINER contourne RLS : sans ce filtre, n'importe quel
     -- utilisateur authentifie lirait la consommation de n'importe quelle
     -- organisation en devinant son UUID. Meme garde que get_monthly_usage.
     and (
       auth.role() = 'service_role'
       or exists (
         select 1 from organization_members me
          where me.org_id = p_org_id and me.user_id = auth.uid()
       )
     );
$$;

revoke all on function organization_usage(uuid) from public;
grant execute on function organization_usage(uuid) to authenticated, service_role;

-- Consommation detaillee par membre, pour le rapport du tableau de bord.
-- Reservee aux responsables : un membre simple n'a pas a voir le detail de
-- ses collegues.
create or replace function organization_usage_by_member(p_org_id uuid)
returns table (member_id uuid, credits_used bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id,
         coalesce(sum(coalesce(u.tokens_total, u.tokens_input, 0)), 0)::bigint
    from organization_members m
    join organizations o on o.id = m.org_id
    left join usage_sessions u
           on u.user_id = m.user_id
          and u.started_at >= o.period_start
   where m.org_id = p_org_id
     and (
       auth.role() = 'service_role'
       or exists (
         select 1 from organization_members me
          where me.org_id = p_org_id
            and me.user_id = auth.uid()
            and me.role in ('owner','admin')
       )
     )
   group by m.user_id;
$$;

revoke all on function organization_usage_by_member(uuid) from public;
grant execute on function organization_usage_by_member(uuid) to authenticated, service_role;

-- Index servant la jointure ci-dessus : sans lui, chaque calcul balaye
-- organization_members en entier.
create index if not exists organization_members_org_idx
  on organization_members(org_id);

-- Les tables ne sont jamais lues depuis le navigateur avec la cle anonyme :
-- tout passe par des routes serveur qui verifient le role. On active quand
-- meme RLS sans politique permissive, pour qu'une erreur de configuration
-- future ne les expose pas par defaut.
alter table organizations          enable row level security;
alter table organization_members   enable row level security;
alter table organization_invites   enable row level security;

-- ---------------------------------------------------------------------
-- Retrouver un compte par son adresse.
--
-- L'adresse n'est pas dans user_profiles mais dans auth.users, qui n'est
-- pas exposee par PostgREST. L'alternative serait de parcourir tous les
-- comptes via l'API d'administration — couteux et sans filtre serveur.
--
-- Reservee au service role : une adresse e-mail permettrait sinon de
-- confirmer qui est inscrit chez nous, et d'enumerer les comptes.
-- ---------------------------------------------------------------------
create or replace function user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id from auth.users
   where lower(email) = lower(p_email)
     and auth.role() = 'service_role'
   limit 1;
$$;

revoke all on function user_id_by_email(text) from public;
grant execute on function user_id_by_email(text) to service_role;
