import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/resend', () => ({
  FROM_EMAIL: 'Nexora <noreply@test>',
  resend: { emails: { send: vi.fn() } },
  // Le module compose son message autour de l'entete commune : sans elle
  // dans le double, l'import echoue et les tests du message tombent.
  emailHeader: () => '<img src="https://test/logo.png" alt="Nexora" />',
}))

import {
  composeReminder,
  FENETRE_JOURS,
  JOURS_AVANT,
  reminderFor,
  type SubscriptionEcheance,
} from './renewalReminders'

const MAINTENANT = new Date('2026-11-09T09:00:00Z')
const jours = (n: number) =>
  new Date(MAINTENANT.getTime() + n * 86_400_000).toISOString()

const abo = (sup: Partial<SubscriptionEcheance> = {}): SubscriptionEcheance => ({
  id: 'sub-1',
  periodEnd: jours(7),
  status: 'active',
  cancelAtPeriodEnd: false,
  planName: 'Pro',
  price: 12,
  email: 'client@example.test',
  userName: 'Ada',
  ...sup,
})

describe('faut-il un rappel', () => {
  it('previent du prelevement a une semaine', () => {
    expect(reminderFor(abo(), MAINTENANT)).toBe('renewal')
  })

  it('annonce la fin quand le renouvellement est coupe', () => {
    // Les deux messages disent le contraire l'un de l'autre : annoncer un
    // debit a quelqu'un qui a resilie serait pire que de ne rien dire.
    expect(reminderFor(abo({ cancelAtPeriodEnd: true }), MAINTENANT)).toBe(
      'expiry',
    )
  })

  it('ignore une echeance encore loin', () => {
    expect(reminderFor(abo({ periodEnd: jours(20) }), MAINTENANT)).toBeNull()
  })

  it('previent encore a la veille', () => {
    // La fenetre va jusqu'a l'echeance, pas jusqu'a J-7 seulement : un
    // abonnement cree hier avec une echeance a trois jours doit etre prevenu,
    // meme si c'est tard.
    expect(reminderFor(abo({ periodEnd: jours(1) }), MAINTENANT)).toBe(
      'renewal',
    )
  })

  it('couvre un jour de plus que les sept promis', () => {
    /*
     * Le vrai motif de la marge : sans elle, une echeance a 7,4 jours
     * n'entrait pas dans la fenetre aujourd'hui, et demain elle n'etait plus
     * qu'a 6,4 jours — le rappel partait donc a J-6, en retard sur la
     * promesse faite a l'utilisateur.
     */
    expect(FENETRE_JOURS).toBe(JOURS_AVANT + 1)
    expect(reminderFor(abo({ periodEnd: jours(7.4) }), MAINTENANT)).toBe(
      'renewal',
    )
    expect(reminderFor(abo({ periodEnd: jours(8.5) }), MAINTENANT)).toBeNull()
  })

  it('ne dit rien sur un plan gratuit', () => {
    // Rien ne sera preleve et rien n'expire : annoncer une echeance
    // inquieterait sans raison.
    expect(reminderFor(abo({ price: 0 }), MAINTENANT)).toBeNull()
  })

  it('ne dit rien sur un abonnement qui n est plus actif', () => {
    for (const status of ['canceled', 'past_due', 'paused']) {
      expect(reminderFor(abo({ status }), MAINTENANT)).toBeNull()
    }
  })

  it('ne dit rien sur une echeance deja passee', () => {
    // Cela veut dire que le webhook de renouvellement n'est pas arrive :
    // c'est un probleme a nous, pas quelque chose a annoncer au client.
    expect(reminderFor(abo({ periodEnd: jours(-2) }), MAINTENANT)).toBeNull()
  })

  it('ne tombe pas sur une date illisible', () => {
    expect(reminderFor(abo({ periodEnd: 'pas-une-date' }), MAINTENANT)).toBeNull()
  })
})

describe('le message', () => {
  it('dit le montant, la date, et comment arreter', () => {
    const { subject, html } = composeReminder(abo(), 'renewal')
    expect(subject).toContain('Pro')
    expect(html).toContain('$12')
    expect(html).toContain('November')
    // Un rappel qui annonce un debit sans dire comment l'arreter n'est pas un
    // service rendu, c'est un avis de passage.
    expect(html).toContain('/dashboard')
    expect(html).toMatch(/turn off automatic renewal/i)
  })

  it('n annonce aucun debit quand l acces s arrete', () => {
    const { html } = composeReminder(abo({ cancelAtPeriodEnd: true }), 'expiry')
    expect(html).toMatch(/will not be charged/i)
    expect(html).toMatch(/resume/i)
    expect(html).not.toContain('$12')
  })

  it('reste correct sans nom d utilisateur', () => {
    const { html } = composeReminder(abo({ userName: null }), 'renewal')
    expect(html).toContain('Hi there,')
  })

  it('echappe un nom qui contient du balisage', () => {
    // Le nom vient des metadonnees du compte, donc de l'utilisateur.
    const { html } = composeReminder(
      abo({ userName: '<script>alert(1)</script>' }),
      'renewal',
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
