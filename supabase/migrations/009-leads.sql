-- =====================================================================
-- Demandes Enterprise et candidatures au programme start-up
--
-- Deux tables distinctes parce que les parcours different : Enterprise est
-- une prise de contact commerciale sans engagement, le programme start-up est
-- une demande de remise qui s'approuve ou se refuse, avec une piece
-- justificative et une duree.
-- =====================================================================

create table if not exists enterprise_leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- entreprise
  company_name      text    not null,
  company_website   text    not null,
  company_size      text    not null,   -- '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
  country           text    not null,

  -- contact
  contact_name      text    not null,
  contact_role      text,
  work_email        text    not null,
  phone             text,

  -- besoin
  developers        int,                -- postes a equiper
  ides              text[],             -- 'vscode' | 'jetbrains' | 'cli'
  timeline          text,               -- 'immediate' | '1-3m' | '3-6m' | 'exploring'
  requirements      text[],             -- 'sso' | 'sla' | 'invoicing' | 'residency' | 'onprem'
  message           text,

  -- suivi
  status            text    not null default 'new',  -- new | contacted | won | lost
  notes             text
);

create table if not exists startup_applications (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- entreprise
  company_name      text    not null,
  company_website   text    not null,
  country           text    not null,
  founded_year      int     not null,
  team_size         int     not null,
  funding_stage     text    not null,   -- 'bootstrapped' | 'pre-seed' | 'seed' | 'series-a+'
  funding_amount    text,

  -- contact
  contact_name      text    not null,
  contact_role      text,
  work_email        text    not null,

  -- demande
  requested_plan    text    not null,   -- 'pro' | 'business'
  proof_type        text    not null,   -- 'registration' | 'accelerator' | 'funding' | 'other'
  proof_url         text,
  message           text,

  -- decision
  status            text    not null default 'pending', -- pending | approved | rejected
  reviewed_at       timestamptz,
  discount_percent  int,
  discount_until    date,
  notes             text
);

create index if not exists enterprise_leads_created_idx   on enterprise_leads (created_at desc);
create index if not exists enterprise_leads_status_idx    on enterprise_leads (status);
create index if not exists startup_applications_created_idx on startup_applications (created_at desc);
create index if not exists startup_applications_status_idx  on startup_applications (status);

-- Les deux tables ne sont jamais lues depuis le navigateur : les formulaires
-- ecrivent via une route serveur qui porte la cle de service, et la revue se
-- fait dans l'espace d'administration, lui aussi cote serveur. On active donc
-- RLS sans aucune politique — tout acces anonyme ou authentifie est refuse.
alter table enterprise_leads      enable row level security;
alter table startup_applications  enable row level security;
