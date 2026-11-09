-- Rappels avant prelevement.
--
-- Un abonnement se renouvelait en silence : l'utilisateur decouvrait le
-- debit sur son releve. C'est le genre de surprise qui fait resilier et
-- demander un remboursement, meme quand le service plaisait — le grief porte
-- sur le fait de ne pas avoir eu le choix.
--
-- Cette table n'existe que pour l'idempotence. Le rappel part d'une tache
-- quotidienne qui balaie une fenetre de huit jours, et non la seule date
-- J-7 : si la tache ne tourne pas un jour, le lendemain rattrape. Sans trace
-- de ce qui est deja parti, ce rattrapage enverrait huit fois le meme
-- message.
--
-- La cle porte la FIN DE PERIODE, pas la date d'envoi : chaque echeance a
-- droit a un rappel de chaque sorte, et le renouvellement suivant — qui
-- porte une autre date de fin — en aura un nouveau.

create table if not exists subscription_reminders (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null
    references user_subscriptions (id) on delete cascade,
  -- Copie de current_period_end au moment de l'envoi. Ce n'est pas une
  -- denormalisation paresseuse : c'est elle qui distingue deux echeances du
  -- meme abonnement, donc elle doit rester figee meme quand la ligne
  -- d'abonnement avance.
  period_end timestamptz not null,
  -- 'renewal' = un debit arrive. 'expiry' = le renouvellement est coupe et
  -- l'acces s'arrete. Les deux messages disent le contraire l'un de l'autre,
  -- et un abonnement peut passer de l'un a l'autre dans la meme periode si
  -- l'utilisateur resilie apres avoir recu le premier.
  kind text not null check (kind in ('renewal', 'expiry')),
  sent_at timestamptz not null default now(),

  unique (subscription_id, period_end, kind)
);

comment on table subscription_reminders is
  'Rappels deja envoyes avant une echeance. Sert uniquement a ne pas '
  'renvoyer le meme message a chaque passage de la tache quotidienne.';

-- La tache lit cette table pour chaque abonnement de la fenetre.
create index if not exists subscription_reminders_lookup_idx
  on subscription_reminders (subscription_id, period_end);

-- Personne ne doit lire ni ecrire ces lignes depuis le navigateur : seule la
-- tache planifiee y touche, avec la cle de service. RLS active sans aucune
-- politique permissive ferme la table a tout le reste (voir 013).
alter table subscription_reminders enable row level security;
