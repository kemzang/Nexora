-- Reponses aux tickets de support.
--
-- Jusqu'ici, repondre voulait dire cliquer « Reply by email », donc ouvrir
-- un client mail. Sur une machine qui n'en a pas, le bouton ne faisait
-- rien ; et meme quand il fonctionnait, la reponse partait d'une boite
-- personnelle et ne laissait aucune trace a cote du ticket. Six mois plus
-- tard, « qu'est-ce qu'on lui a repondu ? » n'avait pas de reponse.
--
-- Comme pour le ticket lui-meme, la ligne en base EST le dossier. Le
-- courriel n'est que la notification : s'il echoue, la reponse reste
-- enregistree, l'echec est conserve dans `email_error`, et l'ecran le dit
-- au lieu de laisser croire que le message est parti.

create table if not exists support_ticket_replies (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
    references support_tickets (id) on delete cascade,

  -- L'adresse de l'administrateur qui a repondu, verifiee cote serveur
  -- contre ADMIN_EMAILS : jamais une valeur envoyee par le client.
  author text not null,
  body text not null,

  -- Etat de la NOTIFICATION, pas de la reponse. Une reponse enregistree
  -- dont le courriel n'est pas parti doit se voir : c'est exactement le cas
  -- ou l'on croit avoir repondu sans l'avoir fait.
  email_sent boolean not null default false,
  email_error text,

  created_at timestamptz not null default now()
);

create index if not exists support_ticket_replies_ticket_idx
  on support_ticket_replies (ticket_id, created_at);

alter table support_ticket_replies enable row level security;

-- Meme regle que pour les tickets : rien ne transite par la clef anon, tout
-- passe par les routes serveur qui verifient ADMIN_EMAILS. La seule lecture
-- directe autorisee est celle de l'utilisateur sur SES propres tickets.
drop policy if exists support_ticket_replies_lecture_proprietaire
  on support_ticket_replies;
create policy support_ticket_replies_lecture_proprietaire
  on support_ticket_replies for select
  using (
    exists (
      select 1 from support_tickets t
      where t.id = support_ticket_replies.ticket_id
        and t.user_id = auth.uid()
    )
  );

-- Repondre fait remonter le ticket dans un tri par derniere activite.
create or replace function support_tickets_touch_depuis_reponse()
returns trigger
language plpgsql
as $$
begin
  update support_tickets
     set updated_at = now()
   where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_replies_touch_trigger
  on support_ticket_replies;
create trigger support_ticket_replies_touch_trigger
  after insert on support_ticket_replies
  for each row execute function support_tickets_touch_depuis_reponse();
