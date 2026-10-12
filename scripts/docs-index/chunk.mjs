/**
 * Decoupage d'un document Markdown en fragments indexables.
 *
 * On coupe aux titres plutot qu'a la longueur : un fragment qui commence au
 * milieu d'une phrase ou d'un bloc de code ne veut rien dire, et le modele
 * d'embedding lui donnera un vecteur trompeur. Le titre de section est
 * reinjecte en tete de chaque fragment — sans lui, « il faut appeler cette
 * fonction avant le rendu » ne dit pas de quelle fonction il s'agit.
 */

const MAX_CHARS = 1800   // ~450 tokens, sous la fenetre du modele
const HARD_MAX  = 3600   // on coupe meme au milieu d'un bloc de code au-dela
const MIN_CHARS = 120    // en dessous, le fragment n'apporte rien

// Les docs React portent leur ancre dans le titre, entre accolades et
// commentaire JSX. On la retire : elle pollue l'affichage et l'embedding.
function cleanHeading(h) {
  return h ? h.replace(/\s*\{\/\*.*?\*\/\}\s*/g, '').trim() : h
}

/** Retire l'entete YAML et en extrait le titre s'il y figure. */
function stripFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { body: text, title: null }
  const title = m[1].match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') ?? null
  return { body: text.slice(m[0].length), title }
}

/** Decoupe en sections sur les titres de niveau 1 a 3. */
function splitByHeadings(body) {
  const lines = body.split('\n')
  const sections = []
  let current = { heading: null, lines: [] }
  let inFence = false

  for (const line of lines) {
    // Un « # » dans un bloc de code n'est pas un titre.
    if (/^\s*```/.test(line)) inFence = !inFence
    const h = !inFence && line.match(/^(#{1,3})\s+(.+?)\s*#*$/)
    if (h) {
      if (current.lines.join('\n').trim()) sections.push(current)
      current = { heading: h[2].trim(), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.join('\n').trim()) sections.push(current)
  return sections
}

/** Scinde un texte trop long sans couper un bloc de code. */
function splitLongText(text) {
  if (text.length <= MAX_CHARS) return [text]
  const out = []
  let buf = []
  let size = 0
  let inFence = false

  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence
    buf.push(line)
    size += line.length + 1
    // Hors bloc de code on coupe a la limite souhaitee ; dedans on laisse
    // courir jusqu'a HARD_MAX, sans quoi une section entierement encadree ne
    // serait jamais scindee et formerait un fragment de plusieurs milliers de
    // caracteres, trop long pour le modele d'embedding.
    if ((size >= MAX_CHARS && !inFence) || size >= HARD_MAX) {
      out.push(buf.join('\n'))
      buf = []
      size = 0
      inFence = false
    }
  }
  if (buf.join('\n').trim()) out.push(buf.join('\n'))
  return out
}

export function chunkMarkdown(raw, { path, source, url }) {
  const { body, title: docTitle } = stripFrontmatter(raw)
  const chunks = []

  for (const section of splitByHeadings(body)) {
    const heading = cleanHeading(section.heading) ?? cleanHeading(docTitle)
    const text = section.lines.join('\n').trim()
    if (!text) continue

    for (const piece of splitLongText(text)) {
      if (piece.trim().length < MIN_CHARS) continue
      // Le titre du document et celui de la section precedent le contenu :
      // c'est ce qui rend le fragment comprehensible hors de son document.
      const header = [cleanHeading(docTitle), heading].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' — ')
      chunks.push({
        source,
        path,
        url,
        title: heading ?? docTitle ?? null,
        content: header ? `${header}\n\n${piece.trim()}` : piece.trim(),
      })
    }
  }
  return chunks
}
