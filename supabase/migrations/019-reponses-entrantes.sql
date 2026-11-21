-- Les reponses des clients rejoignent le fil.
--
-- La 018 n'enregistrait que ce que NOUS envoyons. Quand le client
-- repondait, son message partait dans la boite support@ et le panneau n'en
-- savait rien : on y lisait une conversation a sens unique, et il fallait
-- aller chercher la suite ailleurs pour comprendre ou en etait le dossier.
--
-- La table devient donc le fil complet, dans les deux sens.

alter table support_ticket_replies
  add column if not exists direction text not null default 'outbound',
  -- Le texte d'origine, citation comprise. `body` ne garde que la partie
  -- utile ; on ne jette jamais ce qui a ete recu, un detail enterre sous
  -- l'echange recopie peut etre justement celui qui explique le probleme.
  add column if not exists raw_body text,
  -- L'identifiant Resend du courriel recu. Unique : un webhook rejoue —
  -- Resend reessaie — ne doit pas creer un doublon dans le fil.
  add column if not exists provider_message_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'support_ticket_replies_direction_check'
  ) then
    alter table support_ticket_replies
      add constraint support_ticket_replies_direction_check
      check (direction in ('outbound', 'inbound'));
  end if;
end $$;

create unique index if not exists support_ticket_replies_provider_idx
  on support_ticket_replies (provider_message_id)
  where provider_message_id is not null;

comment on column support_ticket_replies.email_sent is
  'Sortant : la notification est-elle partie. Entrant : toujours vrai, le message est arrive par definition.';
comment on column support_ticket_replies.author is
  'Sortant : l''administrateur. Entrant : l''adresse de l''expediteur.';
