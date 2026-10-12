import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, readFile, stat } from 'node:fs/promises'

const run = promisify(execFile)

/**
 * Recupere les fichiers Markdown d'un depot de documentation.
 *
 * Clone superficiel (profondeur 1, sans blobs inutiles) : on ne veut que l'etat
 * courant, pas l'historique. Un depot comme vercel/next.js pese plusieurs
 * centaines de megaoctets avec son historique complet.
 */
export async function fetchDocs(source, log = console.log) {
  const dir = await mkdtemp(join(tmpdir(), `docs-${source.id}-`))
  try {
    log(`  [${source.id}] clone ${source.repo}@${source.ref}…`)
    await run('git', [
      'clone', '--depth', '1', '--filter=blob:none', '--sparse',
      '--branch', source.ref,
      `https://github.com/${source.repo}.git`, dir,
    ], { maxBuffer: 64 * 1024 * 1024 })

    // sparse-checkout limite le telechargement aux dossiers de documentation.
    await run('git', ['-C', dir, 'sparse-checkout', 'set', ...source.include])

    const files = []
    async function walk(rel) {
      const abs = join(dir, rel)
      let entries
      try { entries = await readdir(abs, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        const next = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) { await walk(next); continue }
        if (!/\.mdx?$/.test(e.name)) continue
        if (!source.include.some((p) => next.startsWith(p))) continue
        const content = await readFile(join(dir, next), 'utf8')
        files.push({ path: next, content })
      }
    }
    await walk('')
    log(`  [${source.id}] ${files.length} fichiers Markdown`)
    return files
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
