-- Tickets de support.
--
-- Jusqu'ici, la seule facon de nous joindre etait un lien `mailto:` sur une
-- page que rien ne liait dans la navigation. Deux consequences : presque
-- personne ne la trouvait, et une demande perdue en route — transfert casse,
-- message en indesirable — l'etait DEFINITIVEMENT, sans que nous sachions
-- qu'elle avait existe. On ne peut pas rattraper un message qu'on ignore
-- avoir recu.
--
-- La ligne en base est donc le dossier ; les courriels ne sont que des
-- notifications. Si Resend tombe, le ticket existe quand meme.

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),

  -- Reference courte montree a l'utilisateur (NX-7F3K2). C'est ce qu'il
  -- citera en nous reecrivant : elle doit etre lisible a voix haute, donc
  -- pas d'UUID.
  reference text not null unique,

  -- Nul quand la demande vient d'un visiteur non connecte. C'est voulu :
  -- « je n'arrive pas a me connecter » est precisement le cas ou exiger une
  -- connexion rendrait le support inatteignable.
  user_id uuid references auth.users (id) on delete set null,
  email text not null,

  -- Le type choisi a l'ecran (billing, bug, model, account, feature, other).
  category text not null,
  subject text not null,
  message text not null,

  -- Ce que l'utilisateur n'a pas eu a taper : forfait, etat de l'abonnement,
  -- client et version, systeme, et les champs propres au type choisi.
  context jsonb not null default '{}'::jsonb,

  -- open : personne ne l'a traite.
  -- answered : nous avons repondu, l'echange peut continuer.
  -- closed : termine. La ligne RESTE, elle sort seulement de la vue par
  -- defaut — c'est la raison d'etre de ce champ plutot que d'un delete.
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),

  -- Notes internes : jamais montrees a l'utilisateur.
  admin_notes text,
  handled_by text,
  handled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La vue par defaut n'affiche que les tickets non fermes : l'index evite un
-- parcours complet le jour ou les archives seront majoritaires.
create index if not exists support_tickets_ouverts_idx
  on support_tickets (created_at desc)
  where status <> 'closed';

create index if not exists support_tickets_user_idx
  on support_tickets (user_id, created_at desc);

-- Aucune politique de lecture pour le role `anon` ou `authenticated` : les
-- tickets ne transitent que par les routes serveur, qui verifient
-- ADMIN_EMAILS. Sans RLS active, la clef anon pourrait tout lire.
alter table support_tickets enable row level security;

-- L'utilisateur peut relire SES propres tickets (suivi cote compte), jamais
-- ceux des autres, et ne peut rien modifier.
drop policy if exists support_tickets_lecture_proprietaire on support_tickets;
create policy support_tickets_lecture_proprietaire
  on support_tickets for select
  using (auth.uid() = user_id);

-- Horodatage de modification, pour trier par « derniere activite ».
create or replace function support_tickets_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_touch_trigger on support_tickets;
create trigger support_tickets_touch_trigger
  before update on support_tickets
  for each row execute function support_tickets_touch();
