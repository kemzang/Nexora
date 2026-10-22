-- Echeance du contrat d'une organisation.
--
-- Une equipe obtenait son quota au moment ou on la creait, et le gardait
-- indefiniment. Rien ne reliait Paddle aux organisations — c'est voulu, les
-- ventes entreprise se reglent par virement contre facture — mais il
-- manquait la contrepartie : une date au-dela de laquelle l'acces s'arrete.
--
-- Sans elle, une equipe dont le contrat s'est termine continue de consommer,
-- et personne ne s'en apercoit avant de regarder la facture des fournisseurs.
-- Fermer a la main suppose qu'on y pense le bon jour.
--
-- `null` = pas d'echeance. C'est le cas des contrats a duree indeterminee, et
-- celui des organisations creees avant cette migration : on ne coupe pas
-- retroactivement l'acces de quelqu'un parce qu'on a ajoute une colonne.

alter table organizations
  add column if not exists contract_ends_at timestamptz;

comment on column organizations.contract_ends_at is
  'Fin du contrat. Au-dela, les membres retombent sur leur plan personnel. '
  'NULL = sans echeance.';

-- La resolution de quota passe par la, a chaque requete du proxy.
create index if not exists organizations_active_contract_idx
  on organizations (contract_ends_at)
  where status = 'active';
