import { describe, expect, it } from 'vitest'

import {
  MAX_MESSAGE,
  MAX_REPONSE,
  SUPPORT_CATEGORIES,
  generateReference,
  validerReponse,
  validerTicket,
} from './supportTickets'

/**
 * La porte d'entree du support.
 *
 * Elle est publique par necessite — « je n'arrive pas a me connecter » est
 * justement le cas ou exiger une connexion rendrait le support
 * inatteignable. Ce site a deja du voir supprimer deux routes publiques qui
 * acceptaient n'importe quoi ; celle-ci valide donc avant d'ecrire.
 */

const valide = {
  category: 'bug',
  email: 'Bryan@Example.com',
  subject: 'Autocomplete silencieuse',
  message: "Rien ne s'affiche quand je tape, depuis la 1.0.20.",
  fields: { client: 'VS Code', version: '1.0.21' },
}

describe('validation d un ticket', () => {
  it('accepte une demande complete et normalise l adresse', () => {
    const r = validerTicket(valide)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.ticket.email).toBe('bryan@example.com')
    expect(r.ticket.category).toBe('bug')
    expect(r.ticket.fields.client).toBe('VS Code')
  })

  it('refuse un type inconnu', () => {
    // Un client modifie ne doit pas pouvoir inventer une categorie.
    const r = validerTicket({ ...valide, category: 'facture' })
    expect(r).toEqual({ ok: false, error: 'Unknown request type' })
  })

  it('refuse une adresse invalide', () => {
    const r = validerTicket({ ...valide, email: 'bryan@' })
    expect(r.ok).toBe(false)
  })

  it('refuse un message vide ou trop court', () => {
    // Sans cela, le formulaire se remplit de « salut » et de clics
    // accidentels.
    expect(validerTicket({ ...valide, message: '   ' }).ok).toBe(false)
    expect(validerTicket({ ...valide, message: 'bug' }).ok).toBe(false)
  })

  it('refuse un message demesure', () => {
    const r = validerTicket({ ...valide, message: 'a'.repeat(MAX_MESSAGE + 1) })
    expect(r).toEqual({ ok: false, error: 'Your message is too long' })
  })

  it('exige les champs declares obligatoires', () => {
    // `client` est obligatoire pour un bug : sans lui, le ticket demande un
    // aller-retour avant meme de commencer.
    const r = validerTicket({ ...valide, fields: {} })
    expect(r.ok).toBe(false)
  })

  it('ignore les champs non declares par le type', () => {
    // Sinon `context` devient un depotoir alimente par le client.
    const r = validerTicket({
      ...valide,
      fields: { ...valide.fields, is_admin: 'true', payload: 'x'.repeat(9999) },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.ticket.fields).sort()).toEqual(['client', 'version'])
  })

  it('rejette le champ piege', () => {
    // Invisible a l'ecran : seul un robot le remplit.
    const r = validerTicket({ ...valide, website: 'http://spam.example' })
    expect(r).toEqual({ ok: false, error: 'Invalid submission' })
  })

  it('retombe sur le titre du type quand le sujet est vide', () => {
    const r = validerTicket({ ...valide, subject: '' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.ticket.subject).toBe('Bug in the extension or CLI')
  })
})

describe('reference', () => {
  it('a la forme NX-XXXXX', () => {
    expect(generateReference()).toMatch(/^NX-[A-Z2-9]{5}$/)
  })

  it('evite les caracteres qu on confond en dictant', () => {
    // L'utilisateur la lira au telephone ou la recopiera a la main : I/1 et
    // O/0 y sont une source d'erreur garantie.
    let tire = ''
    for (let i = 0; i < 200; i++) tire += generateReference()
    expect(tire).not.toMatch(/[IO01]/)
  })
})

describe('catalogue des types', () => {
  it('propose une sortie pour ce qui n entre dans aucune case', () => {
    // Sans « other », l'utilisateur choisit au hasard et le tri est fausse
    // des l'arrivee.
    expect(SUPPORT_CATEGORIES.map((c) => c.id)).toContain('other')
  })

  it('demande un message dans chaque type', () => {
    for (const c of SUPPORT_CATEGORIES) {
      const message = c.fields.find((f) => f.name === 'message')
      expect(message, `${c.id} n'a pas de champ message`).toBeTruthy()
      expect(message!.required).toBe(true)
    }
  })

  it('ne declare que des types de champ que le formulaire sait rendre', () => {
    for (const c of SUPPORT_CATEGORIES) {
      for (const f of c.fields) {
        expect(['text', 'textarea', 'select']).toContain(f.type)
        if (f.type === 'select') {
          expect(f.options?.length, `${c.id}.${f.name}`).toBeGreaterThan(1)
        }
      }
    }
  })
})

describe('validerReponse', () => {
  it('accepte une reponse normale et la debarrasse de ses bords', () => {
    const r = validerReponse('  Bonjour, le probleme vient de la 1.0.21.  ')
    expect(r).toEqual({
      ok: true,
      body: 'Bonjour, le probleme vient de la 1.0.21.',
    })
  })

  it('refuse une reponse vide ou faite d espaces', () => {
    /*
     * Le degat n'est pas l'enregistrement d'une ligne inutile : c'est que
     * le ticket passerait a « answered » et sortirait de la file sans que
     * rien n'ait ete dit au client.
     */
    for (const brut of ['', '   ', '\n\t ', null, undefined, 42]) {
      expect(validerReponse(brut as unknown)).toEqual({
        ok: false,
        error: 'The reply is empty',
      })
    }
  })

  it('refuse au-dela de la limite, pas en-deca', () => {
    // La colonne accepterait tout, mais le courriel serait tronque chez le
    // destinataire sans que l'ecran l'annonce.
    expect(validerReponse('a'.repeat(MAX_REPONSE)).ok).toBe(true)
    expect(validerReponse('a'.repeat(MAX_REPONSE + 1))).toEqual({
      ok: false,
      error: 'The reply is too long',
    })
  })

  it('ne compte pas les espaces de bord dans la limite', () => {
    const texte = `  ${'a'.repeat(MAX_REPONSE)}  `
    expect(validerReponse(texte).ok).toBe(true)
  })
})
