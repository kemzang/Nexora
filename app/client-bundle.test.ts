import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

/**
 * Ce qui a le droit d'arriver dans le navigateur.
 *
 * La page /support est partie en production cassee : son composant client
 * importait une constante depuis `lib/supportEmails`, lequel construit un
 * client Resend DES SON CHARGEMENT. Dans le navigateur, sans clef d'API, ce
 * chargement echoue — le serveur rendait le titre, et plus rien en dessous.
 * Un seul import de trop, et la page est blanche.
 *
 * La compilation ne voit rien : du TypeScript valide importe du TypeScript
 * valide. Ce test suit donc les imports locaux depuis chaque composant
 * marque « use client » et refuse ceux qui menent a du code serveur.
 *
 * Il protege aussi d'une fuite : un module qui lit SUPABASE_SERVICE_ROLE_KEY
 * n'a rien a faire dans un paquet telecharge par le visiteur.
 */

const RACINE = path.join(__dirname, '..')

/** Signes qu'un module ne tourne QUE cote serveur. */
const INTERDITS: { motif: RegExp; raison: string }[] = [
  { motif: /from ['"]resend['"]/, raison: 'client Resend' },
  // `process.env.X` et non le simple nom de la variable : celui-ci apparait
  // aussi dans des messages d'erreur (« check that PADDLE_API_KEY... »), et
  // un test qui crie au loup pour une chaine de caracteres finit ignore.
  {
    motif: /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
    raison: 'clef service Supabase',
  },
  { motif: /process\.env\.PADDLE_API_KEY/, raison: 'clef API Paddle' },
  { motif: /from ['"]next\/server['"]/, raison: 'runtime serveur Next' },
]

function fichiers(dossier: string, suffixes: string[]): string[] {
  const trouves: string[] = []
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'node_modules' || entree.name.startsWith('.')) continue
    const complet = path.join(dossier, entree.name)
    if (entree.isDirectory()) trouves.push(...fichiers(complet, suffixes))
    else if (suffixes.some((s) => entree.name.endsWith(s))) trouves.push(complet)
  }
  return trouves
}

/** Resout un import local vers un fichier reel, ou null si externe. */
function resoudre(depuis: string, specificateur: string): string | null {
  let base: string
  if (specificateur.startsWith('@/')) {
    base = path.join(RACINE, specificateur.slice(2))
  } else if (specificateur.startsWith('.')) {
    base = path.resolve(path.dirname(depuis), specificateur)
  } else {
    return null // paquet npm : hors de notre responsabilite
  }
  for (const essai of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    const chemin = base + essai
    if (fs.existsSync(chemin) && fs.statSync(chemin).isFile()) return chemin
  }
  return null
}

const IMPORT = /import\s[^'"]*from\s*['"]([^'"]+)['"]/g

function importsLocaux(fichier: string): string[] {
  const source = fs.readFileSync(fichier, 'utf8')
  const sortie: string[] = []
  for (const m of source.matchAll(IMPORT)) {
    const resolu = resoudre(fichier, m[1])
    if (resolu) sortie.push(resolu)
  }
  return sortie
}

/** Remonte la chaine d'imports jusqu'a un module serveur, s'il y en a un. */
function chaineVersServeur(
  depart: string,
  vus = new Set<string>(),
): { chaine: string[]; raison: string } | null {
  if (vus.has(depart)) return null
  vus.add(depart)

  const source = fs.readFileSync(depart, 'utf8')
  for (const { motif, raison } of INTERDITS) {
    if (motif.test(source)) return { chaine: [depart], raison }
  }

  for (const suivant of importsLocaux(depart)) {
    const trouve = chaineVersServeur(suivant, vus)
    if (trouve) return { chaine: [depart, ...trouve.chaine], raison: trouve.raison }
  }
  return null
}

describe('paquet client', () => {
  it('aucun composant « use client » ne tire du code serveur', () => {
    const clients = fichiers(path.join(RACINE, 'app'), ['.tsx'])
      .concat(fichiers(path.join(RACINE, 'components'), ['.tsx']))
      .filter((f) => {
        const debut = fs.readFileSync(f, 'utf8').slice(0, 200)
        return /^\s*['"]use client['"]/.test(debut)
      })

    // S'il n'y en a aucun, c'est que la detection est cassee, pas que le
    // site n'a plus de composant client.
    expect(clients.length).toBeGreaterThan(5)

    const fautes: string[] = []
    for (const client of clients) {
      const trouve = chaineVersServeur(client)
      if (trouve) {
        const chemin = trouve.chaine
          .map((f) => path.relative(RACINE, f))
          .join('\n      -> ')
        fautes.push(`${trouve.raison} :\n      ${chemin}`)
      }
    }

    expect(fautes.join('\n\n')).toBe('')
  })
})
