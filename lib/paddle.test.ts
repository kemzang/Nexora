import { describe, expect, it } from 'vitest'

import { messagePaddle, paddleSubscriptionIdFromReference } from './paddle'

/**
 * Le motif de ces tests : « Erreur Paddle (403) » s'est affiche a l'ecran et
 * il a fallu lire le code, la configuration Vercel et la documentation pour
 * comprendre un refus dont Paddle donnait la raison dans sa reponse.
 */
describe('message d erreur Paddle', () => {
  const corps403 = JSON.stringify({
    error: {
      code: 'forbidden',
      detail: 'You do not have permission to perform this action.',
    },
  })

  it('explique la cause la plus frequente d un 403', () => {
    // Un 403 ici vient presque toujours du meme endroit : la cle interroge un
    // environnement, l abonnement vit dans l autre.
    const m = messagePaddle(403, corps403)
    expect(m).toContain('PADDLE_ENV')
    expect(m).toContain('PADDLE_API_KEY')
    expect(m).toContain('forbidden')
    expect(m).toContain('You do not have permission')
  })

  it('dit ou chercher quand l abonnement est introuvable', () => {
    const m = messagePaddle(404, '{}')
    expect(m).toMatch(/other environment/i)
  })

  it('garde le code et le detail pour les autres statuts', () => {
    const m = messagePaddle(
      422,
      JSON.stringify({ error: { code: 'invalid_field', detail: 'bad date' } }),
    )
    expect(m).toContain('422')
    expect(m).toContain('invalid_field')
    expect(m).toContain('bad date')
  })

  it('survit a une reponse qui n est pas du JSON', () => {
    // Un proxy ou une page d erreur HTML : le message doit rester lisible
    // plutot que de faire tomber la route.
    const m = messagePaddle(502, '<html><body>Bad Gateway</body></html>')
    expect(m).toContain('502')
    expect(m).toContain('Bad Gateway')
  })

  it('tronque un corps d erreur demesure', () => {
    // Un corps entier dans une notification la rend illisible.
    const m = messagePaddle(500, 'x'.repeat(5000))
    expect(m.length).toBeLessThan(300)
  })

  it('reste lisible quand Paddle ne donne ni code ni detail', () => {
    const m = messagePaddle(403, '{}')
    expect(m).toContain('403')
    expect(m).not.toContain('undefined')
    expect(m).not.toContain('—.')
  })
})

describe('reference d abonnement', () => {
  it('extrait l identifiant Paddle', () => {
    expect(paddleSubscriptionIdFromReference('paddle_sub_sub_123')).toBe('sub_123')
  })

  it('rend null pour une reference d un autre prestataire', () => {
    // Les abonnements Lemon Squeezy et NotchPay vivent encore en base.
    expect(paddleSubscriptionIdFromReference('ls_sub_999')).toBeNull()
  })
})
