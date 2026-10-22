/**
 * @file Etat du contrat d'une organisation, pour l'affichage.
 *
 * L'echeance ne sert a rien si on ne la voit qu'une fois depassee : le
 * client appelle pour dire que son equipe n'a plus acces, et on decouvre
 * qu'on avait trente jours pour le relancer. L'alerte doit arriver avant.
 */

/** Fenetre d'alerte. Un mois laisse le temps de relancer et de refacturer. */
export const CONTRACT_WARNING_DAYS = 30

export type ContractState =
  | { kind: 'none' }
  | { kind: 'ok'; days: number }
  | { kind: 'ending'; days: number }
  | { kind: 'expired'; days: number }

export function contractState(
  contractEndsAt: string | null | undefined,
  now = new Date(),
): ContractState {
  if (!contractEndsAt) return { kind: 'none' }
  const end = new Date(contractEndsAt)
  if (Number.isNaN(end.getTime())) return { kind: 'none' }

  const ms = end.getTime() - now.getTime()
  // Arrondi au jour superieur : il reste « 1 jour » jusqu'a la derniere
  // minute, et non « 0 jour » pendant vingt-trois heures.
  const days = Math.ceil(ms / 86_400_000)

  if (ms <= 0) return { kind: 'expired', days: Math.abs(days) }
  if (days <= CONTRACT_WARNING_DAYS) return { kind: 'ending', days }
  return { kind: 'ok', days }
}

/** Phrase prete a afficher, du point de vue de l'administrateur. */
export function contractLabel(state: ContractState): string | null {
  switch (state.kind) {
    case 'none':
      return null
    case 'ok':
      return `Contract runs for ${state.days} more days`
    case 'ending':
      return state.days === 1
        ? 'Contract ends tomorrow — renew or the team loses access'
        : `Contract ends in ${state.days} days — renew or the team loses access`
    case 'expired':
      return state.days === 0
        ? 'Contract expired today — the team is back on personal plans'
        : `Contract expired ${state.days} days ago — the team is back on personal plans`
  }
}
