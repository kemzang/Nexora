-- =====================================================================
-- Limitation des comptes gratuits par machine
--
-- Le palier gratuit offre 100 000 credits par mois et par compte. Rien
-- n'empechait d'ouvrir autant de comptes que d'adresses jetables, chacun
-- consommant de vrais appels d'API factures a Nexora.
--
-- On lie donc chaque compte a la machine qui l'a active. Au-dela de deux
-- comptes par machine, les suivants gardent l'acces au produit mais perdent
-- le quota gratuit : ils doivent s'abonner.
--
-- Deux et non un : une reinstallation propre de l'editeur change
-- l'identifiant, et un poste partage entre deux developpeurs est un cas
-- legitime. Un verrou strict punirait ces situations.
-- =====================================================================

create table if not exists machine_accounts (
  machine_id  text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (machine_id, user_id)
);

create index if not exists machine_accounts_machine_idx on machine_accounts (machine_id);
create index if not exists machine_accounts_user_idx    on machine_accounts (user_id);

-- Marque posee a la liaison, lue au calcul du quota : evite de transporter
-- l'identifiant de machine sur chaque requete de modele.
alter table user_profiles
  add column if not exists free_quota_blocked boolean not null default false;

comment on column user_profiles.free_quota_blocked is
  'Pose a true quand le compte est le 3e ou plus sur une meme machine. '
  'Le palier gratuit ne lui accorde alors aucun credit ; les plans payants '
  'ne sont pas affectes.';

-- Ecrit uniquement par le serveur, via la cle de service.
alter table machine_accounts enable row level security;
