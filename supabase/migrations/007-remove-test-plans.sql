-- ──────────────────────────────────────────────────────────────────────────
-- 007 — Retire définitivement les forfaits de test (test1 / test2).
--
-- La migration 006 s'était contentée de les désactiver (is_active = false).
-- Ils restaient donc en base, et surtout dans le code : la page de prix les
-- affichait avec un bouton « Choisir » actif alors qu'aucun identifiant de
-- prix Paddle ne leur correspondait. Le checkout ne pouvait qu'échouer.
--
-- Un forfait visible mais non achetable est un motif de refus en revue Paddle,
-- d'où le retrait complet plutôt qu'une simple désactivation.
--
-- À exécuter une fois dans le SQL Editor de Supabase.
-- ──────────────────────────────────────────────────────────────────────────

-- Aucun achat n'a pu aboutir (pas d'identifiant de prix Paddle), mais on ne
-- supprime pas une ligne encore référencée : toute souscription pointant vers
-- un forfait de test bascule d'abord vers le forfait gratuit.
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'free'),
    status = 'cancelled'
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE slug IN ('test1', 'test2'));

DELETE FROM subscription_plans
WHERE slug IN ('test1', 'test2');
