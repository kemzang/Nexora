import { describe, expect, it } from 'vitest'
import { billingWindow, secondsUntilReset, windowStartIso } from './billingWindow'

/**
 * La fenetre ancree sur l'inscription reste la regle pour les comptes
 * gratuits. Pour les abonnes, c'est la periode d'abonnement qui fait foi —
 * cette logique-la vit dans le proxy (getQuotaWindow) et s'appuie sur
 * `current_period_start`, mis a jour a chaque paiement ET a chaque
 * renouvellement.
 */
describe('billingWindow — comptes gratuits', () => {
  it('ancre la fenetre sur le jour d inscription, pas sur le 1er du mois', () => {
    const w = billingWindow('2026-01-28T10:00:00Z', new Date('2026-06-15T12:00:00Z'))
    expect(w.start.getDate()).toBe(28)
    expect(w.start.getMonth()).toBe(4) // mai : le 28 mai est le dernier ancrage passe
    expect(w.end.getDate()).toBe(28)
    expect(w.end.getMonth()).toBe(5) // juin
  })

  it('borne le jour d ancrage au dernier jour du mois', () => {
    // Inscrit un 31 : en fevrier, la bascule tombe le 28 (ou 29).
    const w = billingWindow('2026-01-31T10:00:00Z', new Date('2026-02-20T12:00:00Z'))
    expect(w.start.getMonth()).toBe(0) // janvier
    expect(w.end.getMonth()).toBe(1) // fevrier
    expect(w.end.getDate()).toBe(28) // 2026 n'est pas bissextile
  })

  it('ne retombe jamais sur une fenetre future', () => {
    const now = new Date('2026-06-05T12:00:00Z')
    const w = billingWindow('2026-01-28T10:00:00Z', now)
    expect(w.start.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(w.end.getTime()).toBeGreaterThan(now.getTime())
  })

  it('retombe sur le mois civil sans date d inscription connue', () => {
    const w = billingWindow(null, new Date('2026-06-15T12:00:00Z'))
    expect(w.start.getDate()).toBe(1)
  })

  it('donne un delai de remise a zero toujours positif', () => {
    expect(
      secondsUntilReset('2026-01-28T10:00:00Z', new Date('2026-06-15T12:00:00Z')),
    ).toBeGreaterThan(0)
  })

  it('expose le debut de fenetre en ISO', () => {
    const iso = windowStartIso('2026-01-28T10:00:00Z', new Date('2026-06-15T12:00:00Z'))
    expect(() => new Date(iso).toISOString()).not.toThrow()
    expect(new Date(iso).getDate()).toBe(28)
  })
})

/**
 * Ces cas reproduisent les trois defauts corriges le 18 octobre 2026. Ils
 * decrivent le comportement attendu de getQuotaWindow, qui prefere la
 * periode d'abonnement a la date d'inscription.
 */
describe('fenetre d abonnement — regles attendues', () => {
  /** Reproduit getQuotaWindow sans dependre du proxy. */
  function quotaWindow(
    sub: { start?: string; end?: string },
    signup: string,
    now: Date,
  ) {
    if (sub.start && sub.end) {
      return {
        startIso: new Date(sub.start).toISOString(),
        secondsUntilReset: Math.max(
          1,
          Math.ceil((new Date(sub.end).getTime() - now.getTime()) / 1000),
        ),
      }
    }
    return {
      startIso: windowStartIso(signup, now),
      secondsUntilReset: secondsUntilReset(signup, now),
    }
  }

  const signup = '2026-01-01T10:00:00Z'

  it('ignore la date d inscription quand un abonnement existe', () => {
    const now = new Date('2026-06-20T12:00:00Z')
    const w = quotaWindow(
      { start: '2026-06-18T09:00:00Z', end: '2026-07-18T09:00:00Z' },
      signup,
      now,
    )
    // Sans le correctif, la fenetre serait partie du 1er juin.
    expect(new Date(w.startIso).getDate()).toBe(18)
  })

  it('repart de zero a la montee en gamme', () => {
    // L achat ecrit current_period_start = maintenant : rien d anterieur ne
    // doit etre compte, sinon on paie 15M pour en recevoir 11.
    const achat = new Date('2026-06-20T12:00:00Z')
    const w = quotaWindow(
      { start: achat.toISOString(), end: '2026-07-20T12:00:00Z' },
      signup,
      achat,
    )
    expect(new Date(w.startIso).getTime()).toBe(achat.getTime())
  })

  it('repart de zero au renouvellement', () => {
    // Le renouvellement doit AUSSI avancer le debut : en ne repoussant que la
    // fin, la fenetre s allongeait et la consommation ne repartait jamais.
    const renouvellement = new Date('2026-07-18T09:00:00Z')
    const w = quotaWindow(
      { start: renouvellement.toISOString(), end: '2026-08-18T09:00:00Z' },
      signup,
      renouvellement,
    )
    expect(new Date(w.startIso).getTime()).toBe(renouvellement.getTime())
  })

  it('revient a l anniversaire d inscription sans abonnement', () => {
    const now = new Date('2026-06-20T12:00:00Z')
    const w = quotaWindow({}, signup, now)
    expect(new Date(w.startIso).getDate()).toBe(1)
  })
})
