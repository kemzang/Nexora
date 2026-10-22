-- Archivage des demandes, au lieu de leur suppression.
--
-- Le formulaire Enterprise est public : il arrivera du spam, des doublons et
-- des tests. Mais une demande effacee est une information perdue pour de bon
-- — on ne peut plus ni verifier qui avait ecrit, ni revenir sur une erreur de
-- clic, ni retrouver un prospect qu'on avait ecarte trop vite.
--
-- La ligne reste donc en base, horodatee et signee. L'interface se contente
-- de ne plus l'afficher.
--
-- Ce qui n'est PAS couvert par ce choix : une demande d'effacement au titre
-- du RGPD exige une suppression reelle. Elle se fait a la main, en SQL, et
-- reste volontairement hors de portee de l'interface — ce n'est pas un geste
-- qu'on doit pouvoir faire d'un clic.

alter table enterprise_leads
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

alter table startup_applications
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

-- Les lectures filtrent toujours sur « non archive » : l'index evite un
-- parcours complet quand la table se remplira d'archives.
create index if not exists enterprise_leads_active_idx
  on enterprise_leads (created_at desc)
  where archived_at is null;

create index if not exists startup_applications_active_idx
  on startup_applications (created_at desc)
  where archived_at is null;
