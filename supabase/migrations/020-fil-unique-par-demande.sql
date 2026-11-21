-- Une demande, un fil. Et l'utilisateur sait ce qu'il n'a pas lu.
--
-- Deux manques se repondaient.
--
-- Rien ne distinguait un ticket auquel on avait repondu depuis la
-- derniere visite de l'utilisateur d'un ticket deja lu. L'etat
-- « answered » dit que NOUS avons repondu, pas que LUI l'a vu : au
-- troisieme dossier, il ne savait plus lequel attendait son attention.
--
-- Et rien n'empechait d'ouvrir cinq demandes pour le meme probleme. On
-- repondait alors sur l'une d'elles, et les quatre autres restaient
-- ouvertes sans reponse — du point de vue de l'utilisateur, un support
-- qui ignore quatre messages sur cinq.

-- Quand l'utilisateur a regarde ce dossier pour la derniere fois. Nul
-- tant qu'il ne l'a pas ouvert depuis l'interface : tout ce qui est
-- arrive est alors nouveau pour lui.
alter table support_tickets
  add column if not exists user_seen_at timestamptz;

-- Les demandes rattachees a celle-ci. Renseigne uniquement sur les
-- dossiers fusionnes avant que cette regle n'existe, ou fusionnes a la
-- main par un administrateur : depuis, le second message rejoint
-- directement le fil du premier et aucun ticket n'est cree.
alter table support_tickets
  add column if not exists merged_into uuid
    references support_tickets (id) on delete set null;

create index if not exists support_tickets_merged_idx
  on support_tickets (merged_into)
  where merged_into is not null;

-- Retrouver le dossier ouvert le plus ancien d'une personne, pour une
-- categorie donnee : c'est la requete faite a chaque nouvelle demande.
create index if not exists support_tickets_ouvert_par_personne_idx
  on support_tickets (email, category, created_at)
  where status <> 'closed';

comment on column support_tickets.user_seen_at is
  'Derniere consultation par l''utilisateur. Sert a signaler une reponse non lue — « answered » dit que nous avons repondu, pas qu''il l''a vu.';
comment on column support_tickets.merged_into is
  'Dossier qui absorbe celui-ci. Le plus ancien gagne : repondre deux fois au meme probleme, c''est se contredire.';
