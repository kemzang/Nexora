import { describe, expect, it, vi } from 'vitest'

const envoye = vi.hoisted(() => ({ dernier: null as any }))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: vi.fn(async (m: any) => {
        envoye.dernier = m
        return { data: {}, error: null }
      }),
    }
  },
}))

import { planHighlights } from './models'
import { sendPaymentConfirmation } from './resend'

async function envoyer() {
  const { credits, models } = planHighlights('starter')
  await sendPaymentConfirmation({
    to: 'client@example.test',
    userName: 'Ada',
    planName: 'Starter',
    credits,
    models,
  })
  return envoye.dernier
}

describe('message de bienvenue', () => {
  it('ne redit pas ce que Paddle envoie deja', async () => {
    /*
     * Paddle est Merchant of Record : le recu lui appartient, avec le
     * montant, la carte et l'identifiant de transaction. La version maison
     * les repetait — et affichait « Card: •••• •••• », faute d'avoir un
     * numero a y mettre.
     */
    const m = await envoyer()
    expect(m.html).not.toMatch(/Amount:/i)
    expect(m.html).not.toMatch(/Card:/i)
    expect(m.html).not.toContain('•••• ••••')
    expect(m.html).toMatch(/Paddle has sent your receipt/i)
  })

  it('dit ou installer, pour les trois clients', async () => {
    // C'est le seul moment ou l'on a l'attention de quelqu'un qui vient de
    // payer ; ne pas lui dire ou aller prepare une demande de remboursement.
    const m = await envoyer()
    expect(m.html).toContain('marketplace.visualstudio.com/items?itemName=nexoracoding.nexora-ai')
    expect(m.html).toContain('plugins.jetbrains.com/plugin/34609-nexora')
    expect(m.html).toContain('npm i -g @nexoracoding/cli')
  })

  it('annonce ce que le palier donne vraiment', async () => {
    const m = await envoyer()
    expect(m.html).toContain('4,000,000 credits')
    expect(m.html).toContain('DeepSeek Flash')
    expect(m.html).toContain('Claude Haiku 5.5')
  })

  it('porte une adresse de reponse lue', async () => {
    // Une reponse a noreply@ disparait sans bruit.
    const m = await envoyer()
    expect(m.replyTo).toBe('contact@nexoracoding.com')
    expect(m.from).toContain('noreply@')
  })

  it('met en avant l absence de cle API', async () => {
    // C'est l'argument face a Continue et Cline, et il n'etait nulle part.
    const m = await envoyer()
    expect(m.html).toMatch(/no API key to set up/i)
  })
})

describe('donnees du palier', () => {
  it('enumere les modeles en une phrase', () => {
    const { models } = planHighlights('starter')
    expect(models).toMatch(/ and /)
    expect(models).not.toMatch(/,\s*$/)
  })

  it('formate le volume mensuel', () => {
    expect(planHighlights('pro').credits).toBe('15,000,000')
  })

  it('ne tombe pas sur un palier inconnu', () => {
    // Un plan retire du catalogue ne doit pas faire echouer l'envoi.
    expect(planHighlights('plan-disparu')).toEqual({ credits: '', models: '' })
  })
})
