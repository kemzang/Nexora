-- =====================================================================
-- Remise a zero des donnees Nexora
--
-- A executer dans Supabase > SQL Editor.
-- IRREVERSIBLE : Supabase ne propose pas d'annulation sur ces operations.
-- Faites une sauvegarde avant (Database > Backups) si le moindre doute.
--
-- Les tables de reference (subscription_plans, ai_models) sont volontairement
-- preservees : elles sont remplies par les migrations et l'application en
-- depend pour rattacher un abonnement a son plan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARTIE A — vider les donnees applicatives, conserver les comptes
-- ---------------------------------------------------------------------
BEGIN;

TRUNCATE TABLE
  collab_annotations,
  collab_messages,
  room_members,
  collaboration_rooms,
  chat_messages,
  chat_sessions,
  token_transactions,
  daily_usage,
  usage_sessions,
  invoices,
  user_subscriptions,
  api_keys,
  user_model_configs,
  assistants,
  response_templates,
  webhook_events,
  system_logs
RESTART IDENTITY CASCADE;

COMMIT;

-- ---------------------------------------------------------------------
-- PARTIE B — supprimer aussi les comptes (remise a zero totale)
--
-- N'executez ceci que si vous voulez vraiment repartir sans aucun compte,
-- Y COMPRIS LE VOTRE : il faudra vous reinscrire ensuite.
-- Retirez les deux tirets devant chaque ligne pour l'activer.
-- ---------------------------------------------------------------------
-- BEGIN;
-- TRUNCATE TABLE user_profiles RESTART IDENTITY CASCADE;
-- DELETE FROM auth.users;
-- COMMIT;

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
SELECT 'subscription_plans' AS table_conservee, count(*) FROM subscription_plans
UNION ALL SELECT 'ai_models', count(*) FROM ai_models
UNION ALL SELECT 'user_profiles (comptes)', count(*) FROM user_profiles
UNION ALL SELECT 'user_subscriptions', count(*) FROM user_subscriptions;
