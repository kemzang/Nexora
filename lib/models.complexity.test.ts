import { describe, expect, it } from 'vitest'
import {
  analyzeComplexity,
  getFailoverCandidates,
  getModelsForPlan,
  MODELS,
  selectBestModel,
} from './models'

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
