/**
 * Fenetre de consommation d'un utilisateur.
 *
 * Le quota repartait au premier jour du mois civil, pour tout le monde. Deux
 * consequences genantes : quelqu'un qui s'inscrivait le 28 recevait un quota
 * complet pour trois jours puis un quota neuf le 1er, et un abuseur qui l'avait
 * compris s'inscrivait en fin de mois pour consommer deux fois.
 *
 * La fenetre est desormais ancree sur le jour d'inscription : inscrit le 28,
 * le compteur repart le 28 de chaque mois. Chacun dispose d'exactement un
 * quota par mois, quelle que soit sa date d'arrivee.
 */

/** Dernier jour du mois donne (1-12 en base 0, comme Date). */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export type Window = { start: Date; end: Date }

/**
 * Fenetre courante pour un compte cree a `createdAt`.
 *
 * Le jour d'ancrage est borne au dernier jour du mois vise : un compte cree un
 * 31 bascule le 28 ou le 29 en fevrier, puis retrouve le 31 les mois qui le
 * permettent — sans quoi la fenetre deriverait d'un mois sur l'autre.
 */
export function billingWindow(createdAt: string | Date | null | undefined, now = new Date()): Window {
  const created = createdAt ? new Date(createdAt) : null

  // Sans date d'inscription connue, on retombe sur le mois civil : c'est le
  // comportement historique, et il vaut mieux qu'une fenetre arbitraire.
  if (!created || Number.isNaN(created.getTime())) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  const anchorDay = created.getDate()
  const anchorFor = (year: number, monthIndex: number) =>
    new Date(year, monthIndex, Math.min(anchorDay, daysInMonth(year, monthIndex)),
             created.getHours(), created.getMinutes(), created.getSeconds())

  let start = anchorFor(now.getFullYear(), now.getMonth())
  if (start > now) {
    start = anchorFor(now.getFullYear(), now.getMonth() - 1)
  }
  const end = anchorFor(start.getFullYear(), start.getMonth() + 1)

  // Un compte ne consomme pas avant d'exister.
  const safeStart = start < created ? created : start

  // Garde-fou : une date d'inscription posterieure a maintenant produirait une
  // fenetre de largeur nulle, donc un quota immediatement epuise. Le cas ne
  // devrait pas exister, mais il ne doit pas bloquer un utilisateur s'il
  // survient — horloge decalee, donnee importee.
  const safeEnd = end > safeStart ? end : anchorFor(safeStart.getFullYear(), safeStart.getMonth() + 1)

  return { start: safeStart, end: safeEnd }
}

/** Debut de la fenetre courante, au format ISO attendu par Supabase. */
export function windowStartIso(createdAt: string | Date | null | undefined, now = new Date()): string {
  return billingWindow(createdAt, now).start.toISOString()
}

/** Secondes avant la prochaine remise a zero — pour l'en-tete Retry-After. */
export function secondsUntilReset(createdAt: string | Date | null | undefined, now = new Date()): number {
  return Math.max(1, Math.ceil((billingWindow(createdAt, now).end.getTime() - now.getTime()) / 1000))
}

/**
 * Fenetre de quota d'un utilisateur, source unique de verite.
 *
 * Pour un abonne, c'est la periode de son abonnement : le compteur repart au
 * jour du prelevement, et un changement de plan ecrit un
 * `current_period_start` a maintenant, donc un quota neuf. Pour un compte
 * gratuit, c'est l'anniversaire de l'inscription — sans ancrage, quelqu'un
 * inscrit le 28 obtiendrait deux quotas en trois jours.
 *
 * Cette fonction existe parce que quatre endroits calculaient la fenetre
 * chacun a sa maniere : le proxy de chat, celui de completion, le point
 * d'entree des credits et lib/quota. Ils pouvaient se contredire, et
 * l'utilisateur voyait un pourcentage qui ne correspondait pas a ce qui le
 * bloquait.
 */
export type QuotaWindow = {
  start: Date
  end: Date
  /** Secondes avant la remise a zero, pour l'en-tete Retry-After. */
  secondsUntilReset: number
  /** true si la fenetre suit un abonnement plutot que l'inscription. */
  fromSubscription: boolean
}

export function quotaWindow(
  opts: {
    createdAt?: string | Date | null
    periodStart?: string | Date | null
    periodEnd?: string | Date | null
  },
  now = new Date(),
): QuotaWindow {
  const { createdAt, periodStart, periodEnd } = opts

  if (periodStart && periodEnd) {
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return {
        start,
        end,
        secondsUntilReset: Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000)),
        fromSubscription: true,
      }
    }
  }

  const w = billingWindow(createdAt, now)
  return {
    start: w.start,
    end: w.end,
    secondsUntilReset: Math.max(1, Math.ceil((w.end.getTime() - now.getTime()) / 1000)),
    fromSubscription: false,
  }
}
