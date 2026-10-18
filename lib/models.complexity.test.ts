import { describe, expect, it } from 'vitest'
import {
  analyzeComplexity,
  getFailoverCandidates,
  getModelsForPlan,
  MODELS,
  PLANS,
  selectBestModel,
} from './models'
import { STARTUP_PROGRAM } from './leads'

/** Un message d'agent : une courte demande noyee dans du contexte injecte. */
function agentMessage(ask: string, fileLines = 400): string {
  const file = Array.from(
    { length: fileLines },
    (_, i) => `  const value${i} = compute(${i})`,
  ).join('\n')
  return `${ask}\n\n\`\`\`ts\n${file}\n\`\`\``
}

describe('analyzeComplexity', () => {
  it('ne confond plus le volume du contexte avec la difficulte', () => {
    // Meme demande triviale, avec et sans fichier joint : meme note.
    const nu = analyzeComplexity([
      { role: 'user', content: 'renomme cette variable en userCount' },
    ])
    const charge = analyzeComplexity([
      { role: 'user', content: agentMessage('renomme cette variable en userCount') },
    ])
    expect(charge).toBe(nu)
    expect(charge).toBeLessThanOrEqual(2)
  })

  it('reconnait une vraie tache de conception', () => {
    const score = analyzeComplexity([
      {
        role: 'user',
        content: agentMessage(
          "refactor l'architecture du module de paiement pour supporter plusieurs fournisseurs",
        ),
      },
    ])
    expect(score).toBeGreaterThanOrEqual(4)
  })

  it('garde une salutation au minimum, meme tard dans la conversation', () => {
    const history = Array.from({ length: 30 }, () => ({
      role: 'user' as const,
      content: agentMessage('continue'),
    }))
    const score = analyzeComplexity([...history, { role: 'user', content: 'merci !' }])
    expect(score).toBe(1)
  })

  it("n'ouvre le palier 5 que sur une specification detaillee", () => {
    const courte = analyzeComplexity([
      { role: 'user', content: agentMessage("refactor l'architecture du module") },
    ])
    expect(courte, 'huit mots ne doivent pas declencher le modele le plus cher').toBe(4)

    const detaillee = analyzeComplexity([
      {
        role: 'user',
        content: agentMessage(
          "refactor l'architecture du module de paiement. " +
            'Il faut extraire une interface par fournisseur, deplacer la logique de ' +
            'reessai dans une couche dediee, conserver la compatibilite avec les ' +
            'webhooks existants, prevoir la migration des abonnements en cours sans ' +
            'interruption de service, et documenter le contrat attendu de chaque ' +
            'implementation. Les tests doivent couvrir le cas du fournisseur ' +
            'indisponible et celui du paiement partiellement capture, ainsi que la ' +
            'reprise apres incident et la coherence des montants. Enfin, prevoir ' +
            'un mode degrade lorsque aucun fournisseur ne repond, avec mise en ' +
            'file des demandes et rejeu automatique une fois le service retabli.',
        ),
      },
    ])
    expect(detaillee).toBe(5)
  })

  it('reste borne entre 1 et 5', () => {
    const extreme = analyzeComplexity([
      {
        role: 'user',
        content:
          'refactor architecture migration optimisation securite performance scalabilite deadlock race condition algorithme complexite '.repeat(
            20,
          ),
      },
    ])
    expect(extreme).toBeLessThanOrEqual(5)
    expect(analyzeComplexity([])).toBeGreaterThanOrEqual(1)
  })
})

describe('plan Starter', () => {
  it("n'expose aucun modele que son plafond ne peut pas financer", () => {
    const CREDITS = 4_000_000
    const TOUR = 40_000 // jetons d'un tour d'agent ordinaire
    for (const id of getModelsForPlan('starter')) {
      const tours = CREDITS / (TOUR * MODELS[id].creditMultiplier)
      expect(tours, `${id} ne donne que ${tours.toFixed(0)} tours`).toBeGreaterThan(20)
    }
  })
})

describe('mode Auto', () => {
  it('prend le moins cher a capacite egale', () => {
    // Demande simple : plusieurs modeles conviennent, le prix doit trancher.
    const { model } = selectBestModel('business', undefined, [
      { role: 'user', content: 'ajoute un commentaire ici' },
    ])
    const eligibles = getModelsForPlan('business')
      .map((id) => MODELS[id])
      .filter((m) => m.capability >= 1)
    const moinsCher = Math.min(...eligibles.map((m) => m.creditMultiplier))
    expect(model.creditMultiplier).toBe(moinsCher)
  })

  it('ne propose jamais un repli plus cher que necessaire en tete de liste', () => {
    const { candidates } = getFailoverCandidates('business', undefined, [
      { role: 'user', content: 'corrige cette faute de frappe' },
    ])
    // Les deux premiers candidats doivent etre parmi les moins chers du plan.
    const tries = [...candidates].sort(
      (a, b) => a.creditMultiplier - b.creditMultiplier,
    )
    expect(candidates[0].creditMultiplier).toBe(tries[0].creditMultiplier)
  })
})

/**
 * Les marges sont l'argument commercial central : « rentable meme si le
 * client depense tout son quota sur le modele le plus cher ». Ces tests
 * empechent qu'un changement de prix, de plafond ou de remise le rende faux
 * sans que personne s'en apercoive.
 */
describe('marges', () => {
  const cout = (m: (typeof MODELS)[keyof typeof MODELS], jetons: number) =>
    (jetons / 2 / 1000) * m.inputCostPer1K + (jetons / 2 / 1000) * m.outputCostPer1K

  /** Cout maximal d'un forfait : tout le quota sur son modele le plus cher. */
  function pireCas(planId: keyof typeof PLANS): number {
    const plan = PLANS[planId]
    const pire = getModelsForPlan(planId)
      .map((id) => MODELS[id])
      .sort((a, b) => b.creditMultiplier - a.creditMultiplier)[0]
    return cout(pire, plan.tokensPerMonth / pire.creditMultiplier)
  }

  it('chaque forfait payant reste rentable au pire cas', () => {
    for (const id of ['starter', 'pro', 'business', 'enterprise'] as const) {
      const marge = PLANS[id].price - pireCas(id)
      expect(marge, `${id} perd ${(-marge).toFixed(2)} $ au pire`).toBeGreaterThan(0)
    }
  })

  it('reste rentable apres la remise start-up', () => {
    // A 30 %, Business tombait a 21 $ pour un cout pouvant atteindre 21,82 $.
    const remise = 1 - STARTUP_PROGRAM.discountPercent / 100
    for (const id of STARTUP_PROGRAM.eligiblePlans) {
      const marge = PLANS[id].price * remise - pireCas(id)
      expect(marge, `${id} remise perd ${(-marge).toFixed(2)} $ au pire`).toBeGreaterThan(0)
    }
  })

  it('le forfait equipe ne coute pas plus cher que des comptes individuels', () => {
    // A 35 $ le siege, Enterprise revenait a 0,875 $ le million de credits
    // contre 0,800 $ pour des comptes Pro : personne n'avait de raison de le
    // signer.
    const parMillion = (prix: number, credits: number) => prix / (credits / 1e6)
    const ent = parMillion(PLANS.enterprise.price, 40_000_000)
    const pro = parMillion(PLANS.pro.price, PLANS.pro.tokensPerMonth)
    expect(ent).toBeLessThanOrEqual(pro)
  })
})
