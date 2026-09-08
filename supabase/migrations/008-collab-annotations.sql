-- ──────────────────────────────────────────────────────────────────────────
-- 008 — Annotations sur les messages de collaboration (revue d'équipe async).
-- Un membre du salon peut commenter un message précis (souvent une réponse
-- IA) sans polluer le fil de chat principal. room_id est dénormalisé sur la
-- table (plutôt qu'une jointure via message_id -> collab_messages) pour
-- réutiliser directement is_room_member() dans les policies RLS, comme pour
-- collab_messages (voir migration 007).
-- À exécuter une fois dans le SQL Editor de Supabase.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS collab_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES collab_messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name VARCHAR(100) NOT NULL DEFAULT 'Développeur',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_annotations_message ON collab_annotations(message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_collab_annotations_room ON collab_annotations(room_id);

ALTER TABLE collab_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read annotations" ON collab_annotations;
CREATE POLICY "Members read annotations" ON collab_annotations
  FOR SELECT TO authenticated
  USING (is_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "Members insert annotations" ON collab_annotations;
CREATE POLICY "Members insert annotations" ON collab_annotations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND is_room_member(room_id, auth.uid())
  );

-- Activer Supabase Realtime (ignoré si déjà membre de la publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'collab_annotations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE collab_annotations;
  END IF;
END $$;
