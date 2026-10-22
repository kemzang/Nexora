import { describe, expect, it } from 'vitest'
import { contractLabel, contractState, CONTRACT_WARNING_DAYS } from './contractStatus'

const now = new Date('2026-10-22T12:00:00Z')
const dans = (jours: number) =>
  new Date(now.getTime() + jours * 86_400_000).toISOString()

describe('etat du contrat', () => {
  it('ne dit rien quand il n y a pas d echeance', () => {
    // Un contrat a duree indeterminee est legitime : ne pas inventer
    // d'alarme la ou il n'y a rien a surveiller.
    expect(contractState(null, now)).toEqual({ kind: 'none' })
    expect(contractLabel(contractState(null, now))).toBeNull()
  })

  it('reste silencieux tant que l echeance est lointaine', () => {
    expect(contractState(dans(90), now).kind).toBe('ok')
  })

  it('alerte dans le mois qui precede', () => {
    // Un mois laisse le temps de relancer et de refacturer.
    expect(contractState(dans(CONTRACT_WARNING_DAYS - 1), now).kind).toBe('ending')
    expect(contractState(dans(CONTRACT_WARNING_DAYS + 1), now).kind).toBe('ok')
  })

  it('signale un contrat echu', () => {
    const s = contractState(dans(-5), now)
    expect(s).toEqual({ kind: 'expired', days: 5 })
    expect(contractLabel(s)).toContain('5 days ago')
  })

  it('compte le dernier jour comme un jour, pas comme zero', () => {
    // Sans arrondi superieur, il restait « 0 jour » pendant vingt-trois heures.
    const s = contractState(new Date(now.getTime() + 3600_000).toISOString(), now)
    expect(s).toMatchObject({ kind: 'ending', days: 1 })
    expect(contractLabel(s)).toContain('tomorrow')
  })

  it('dit ce qui arrive, pas seulement qu une date passe', () => {
    // « Contract ends in 12 days » n'appelle aucune action ; savoir que
    // l'equipe perd son acces, si.
    expect(contractLabel(contractState(dans(12), now))).toContain('loses access')
  })

  it('ignore une date illisible plutot que d alarmer', () => {
    expect(contractState('pas-une-date', now)).toEqual({ kind: 'none' })
  })
})
