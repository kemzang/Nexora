-- ──────────────────────────────────────────────────────────────────────────
-- 007 — Corrige deux bugs de production découverts via les Postgres Logs :
--
-- 1. "infinite recursion detected in policy for relation room_members"
--    (42P17) — la policy "View members in same room" sur room_members
--    s'auto-référence (EXISTS ... FROM room_members) pour vérifier
--    l'appartenance, ce qui redéclenche sa propre évaluation RLS en boucle.
--    C'est la cause du 500 sur /rest/v1/collaboration_rooms (dont la policy
--    "Members can view room" interroge room_members) et, par ricochet,
--    de collab_messages. Fix standard Postgres/Supabase : passer par une
--    fonction SECURITY DEFINER, qui contourne RLS pendant sa propre requête
--    et casse la récursion.
--
-- 2. "relation user_profiles does not exist" (42P01) juste avant
--    "current transaction is aborted" — handle_new_user() (trigger sur
--    auth.users après INSERT) n'a pas de search_path fixe : son contexte
--    d'exécution ne voit pas forcément le schéma public par défaut. C'est
--    la cause de "Database error saving new user" : plus personne ne peut
--    créer de compte tant que ce n'est pas corrigé.
--
-- À exécuter une fois dans le SQL Editor de Supabase.
-- ──────────────────────────────────────────────────────────────────────────

-- ── Fix 1 : cassons la récursion RLS sur room_members ──────────────────────

CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "View members in same room" ON room_members;
CREATE POLICY "View members in same room" ON room_members
  FOR SELECT TO authenticated
  USING (is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view room" ON collaboration_rooms;
CREATE POLICY "Members can view room" ON collaboration_rooms
  FOR SELECT TO authenticated
  USING (is_room_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members read messages" ON collab_messages;
CREATE POLICY "Members read messages" ON collab_messages
  FOR SELECT TO authenticated
  USING (is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Members insert messages" ON collab_messages;
CREATE POLICY "Members insert messages" ON collab_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND is_room_member(room_id, auth.uid())
  );

-- ── Fix 2 : search_path explicite sur le trigger de signup ─────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
  free_tokens INTEGER;
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name', NEW.email));

  SELECT id, tokens_per_month INTO free_plan_id, free_tokens
  FROM subscription_plans
  WHERE slug = 'free'
  LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end, tokens_remaining
    )
    VALUES (
      NEW.id, free_plan_id, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month', free_tokens
    );

    INSERT INTO token_transactions (
      user_id, transaction_type, amount, balance_after, description
    )
    VALUES (
      NEW.id, 'bonus', free_tokens, free_tokens, 'Bienvenue ! Tokens gratuits du plan Free.'
    );
  END IF;

  RETURN NEW;
END;
$$;
