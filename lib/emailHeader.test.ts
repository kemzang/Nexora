import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('resend', () => ({ Resend: class { emails = { send: vi.fn() } } }))

import { emailHeader } from './resend'

const RACINE = path.resolve(__dirname, '..')
const GABARITS = ['lib/resend.ts', 'lib/orgEmails.ts', 'lib/renewalReminders.ts']

describe('entete des e-mails', () => {
  it('affiche le logo du produit, pas un dessin', () => {
    // Un client recevait sa confirmation de paiement signee d'un emoji
    // cerveau, qui n'existe nulle part ailleurs dans Nexora.
    const h = emailHeader()
    expect(h).toContain('/logo.png')
    expect(h).toContain('<img')
  })

  it('appelle le logo par une URL absolue', () => {
    // Un client de messagerie ne sait charger ni chemin relatif ni fichier
    // local : une URL relative donne une image cassee chez le destinataire.
    expect(emailHeader()).toMatch(/src="https:\/\/[^"]+\/logo\.png"/)
  })

  it('porte un texte de remplacement', () => {
    // Beaucoup de clients bloquent les images par defaut. Le alt est alors
    // tout ce que le lecteur voit a la place du logo.
    expect(emailHeader()).toMatch(/alt="Nexora"/)
  })

  it('fixe les dimensions', () => {
    // Sans width/height, Outlook affiche le PNG en 512x512 et defonce la
    // mise en page.
    expect(emailHeader()).toMatch(/width="\d+"/)
    expect(emailHeader()).toMatch(/height="\d+"/)
  })

  it('aucun gabarit ne redessine son propre en-tete', () => {
    // Le defaut d'origine etait la duplication : le meme bloc recopie dans
    // cinq messages, dont aucun ne connaissait le logo.
    for (const f of GABARITS) {
      const src = fs.readFileSync(path.join(RACINE, f), 'utf8')
      expect(src, `${f} contient un emoji en guise de logo`).not.toMatch(
        /font-size: 28px;">\p{Emoji_Presentation}/u,
      )
    }
  })
})
