import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Comptes gratuits par machine.
 *
 * Le palier gratuit offre 100 000 credits par mois et par compte, et rien
 * n'empechait d'en ouvrir autant que d'adresses jetables — chacun consommant
 * de vrais appels d'API factures a Nexora.
 *
 * On lie donc chaque compte a la machine qui l'a active. Au-dela de la limite,
 * les comptes suivants gardent l'acces au produit mais perdent le quota
 * gratuit. Rien ne le leur annonce : un message expliquerait comment
 * contourner. Les plans payants ne sont jamais affectes.
 */

export const MAX_FREE_ACCOUNTS_PER_MACHINE = 2

function service(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/** Un identifiant d'editeur est un UUID ou un hash ; on refuse le reste. */
function sane(machineId: unknown): string | null {
  if (typeof machineId !== 'string') return null
  const id = machineId.trim()
  return /^[A-Za-z0-9._:-]{8,128}$/.test(id) ? id : null
}

/**
 * Enregistre le lien compte-machine et bloque le quota gratuit si la machine
 * en porte deja trop.
 *
 * Idempotent : la cle primaire composee absorbe les connexions repetees du
 * meme compte sur la meme machine.
 */
export async function linkAccountToMachine(
  userId: string,
  rawMachineId: unknown,
): Promise<void> {
  const machineId = sane(rawMachineId)
  if (!machineId) return

  const db = service()

  await db.from('machine_accounts')
    .upsert({ machine_id: machineId, user_id: userId }, { onConflict: 'machine_id,user_id' })

  const { data, error } = await db
    .from('machine_accounts')
    .select('user_id')
    .eq('machine_id', machineId)
    .order('created_at', { ascending: true })

  if (error || !data) return

  // Les premiers arrives gardent leur quota ; seuls les suivants le perdent.
  // Trier par date d'arrivee evite qu'une nouvelle connexion d'un ancien
  // compte ne le penalise retroactivement.
  const blocked = data.slice(MAX_FREE_ACCOUNTS_PER_MACHINE).map((r) => r.user_id)
  if (blocked.includes(userId)) {
    await db.from('user_profiles')
      .update({ free_quota_blocked: true })
      .eq('id', userId)
  }
}

/** Le compte a-t-il perdu son quota gratuit ? Faux par defaut, y compris en cas d'erreur. */
export async function isFreeQuotaBlocked(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('user_profiles')
    .select('free_quota_blocked')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return false
  return Boolean(data.free_quota_blocked)
}
