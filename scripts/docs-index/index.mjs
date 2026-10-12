#!/usr/bin/env node
/**
 * Indexation de la documentation officielle dans Supabase.
 *
 *   node scripts/docs-index/index.mjs            # toutes les sources
 *   node scripts/docs-index/index.mjs react      # une seule
 *   node scripts/docs-index/index.mjs --dry-run  # sans ecrire
 *
 * Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis .env.local.
 */
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { SOURCES } from './sources.mjs'
import { fetchDocs } from './fetch.mjs'
import { chunkMarkdown } from './chunk.mjs'
import { embedBatch } from './embed.mjs'

const EMBED_BATCH  = 32   // au-dela, la memoire grimpe sans gain de vitesse
const INSERT_BATCH = 200  // compromis entre nombre d'allers-retours et taille de requete

async function loadEnv() {
  const raw = await readFile(new URL('../../.env.local', import.meta.url), 'utf8')
  const get = (k) =>
    raw.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  const url = get('NEXT_PUBLIC_SUPABASE_URL')
  const key = get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
  return { url, key }
}

async function indexSource(db, source, dryRun) {
  const t0 = Date.now()
  const files = await fetchDocs(source)

  const chunks = []
  for (const f of files) {
    chunks.push(...chunkMarkdown(f.content, {
      path: f.path,
      source: source.id,
      url: source.url(f.path),
    }))
  }
  console.log(`  [${source.id}] ${chunks.length} fragments`)
  if (dryRun) {
    console.log(`  [${source.id}] --dry-run : rien n'est écrit`)
    return
  }

  // Remplacement complet plutot qu'incremental : la documentation evolue par
  // reecritures, et comparer fragment par fragment couterait plus cher que de
  // tout recalculer. L'ancien index reste en place jusqu'a la fin de
  // l'insertion — on supprime apres, pour ne jamais laisser la table vide.
  const inserted = []
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH)
    const vectors = await embedBatch(batch.map((c) => c.content), () => {})
    batch.forEach((c, k) => inserted.push({ ...c, embedding: vectors[k], token_count: Math.round(c.content.length / 4) }))
    if (i % (EMBED_BATCH * 10) === 0) {
      process.stdout.write(`\r  [${source.id}] vecteurs ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`)
    }
  }
  process.stdout.write('\n')

  const stamp = new Date().toISOString()
  for (let i = 0; i < inserted.length; i += INSERT_BATCH) {
    const slice = inserted.slice(i, i + INSERT_BATCH).map((c) => ({ ...c, version: stamp }))
    const { error } = await db.from('doc_chunks').insert(slice)
    if (error) throw new Error(`insertion ${source.id} : ${error.message}`)
    process.stdout.write(`\r  [${source.id}] écriture ${Math.min(i + INSERT_BATCH, inserted.length)}/${inserted.length}`)
  }
  process.stdout.write('\n')

  const { error: delErr } = await db
    .from('doc_chunks').delete().eq('source', source.id).neq('version', stamp)
  if (delErr) throw new Error(`purge ${source.id} : ${delErr.message}`)

  console.log(`  [${source.id}] terminé en ${Math.round((Date.now() - t0) / 1000)}s`)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const only = args.filter((a) => !a.startsWith('--'))
const targets = only.length ? SOURCES.filter((s) => only.includes(s.id)) : SOURCES
if (!targets.length) {
  console.error(`Source inconnue. Disponibles : ${SOURCES.map((s) => s.id).join(', ')}`)
  process.exit(1)
}

const { url, key } = await loadEnv()
const db = createClient(url, key, { auth: { persistSession: false } })

for (const source of targets) {
  await indexSource(db, source, dryRun)
}
console.log('Terminé.')
