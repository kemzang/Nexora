/**
 * @file Tache quotidienne : prevenir avant un prelevement ou une fin d'acces.
 *
 * Appelee par le planificateur Vercel (voir vercel.json). La fenetre et le
 * choix du message sont dans lib/renewalReminders.ts ; ici il n'y a que la
 * lecture en base, l'envoi, et la trace qui evite les doublons.
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import {
  FENETRE_JOURS,
  reminderFor,
  sendReminder,
  type SubscriptionEcheance,
} from '@/lib/renewalReminders'

export const dynamic = 'force-dynamic'
// Une centaine d'abonnements a parcourir et autant d'appels a Resend : bien
// au-dela des 10 secondes par defaut.
export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * La route est publique — Vercel l'appelle par HTTP comme n'importe qui.
 *
 * Sans ce controle, un inconnu pourrait la declencher en boucle : les
 * doublons seraient bloques par subscription_reminders, mais chaque appel
 * couterait une lecture de toute la table des abonnements. Vercel envoie le
 * secret dans l'en-tete Authorization.
 */
function autorise(request: Request): boolean {
  const attendu = process.env.CRON_SECRET
  // Pas de secret configure = on refuse. Ouvrir la route par defaut parce
  // qu'une variable manque est exactement la mauvaise facon d'echouer.
  if (!attendu) return false
  return request.headers.get('authorization') === `Bearer ${attendu}`
}

export async function GET(request: Request) {
  if (!autorise(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const maintenant = new Date()
  const limite = new Date(
    maintenant.getTime() + FENETRE_JOURS * 86_400_000,
  ).toISOString()

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(
      'id, user_id, status, current_period_end, cancel_at_period_end, subscription_plans(name, price)',
    )
    .eq('status', 'active')
    .gt('current_period_end', maintenant.toISOString())
    .lte('current_period_end', limite)

  if (error) {
    console.error('[rappels] lecture des abonnements:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const lignes = data ?? []
  let envoyes = 0
  let ignores = 0
  const echecs: string[] = []

  for (const ligne of lignes) {
    const plan = (
      Array.isArray(ligne.subscription_plans)
        ? ligne.subscription_plans[0]
        : ligne.subscription_plans
    ) as { name?: string; price?: number } | null

    // L'adresse ne vit pas dans user_subscriptions : elle est dans
    // auth.users, que seule la cle de service peut lire.
    const { data: compte } = await supabase.auth.admin.getUserById(
      ligne.user_id,
    )
    const email = compte?.user?.email
    if (!email) {
      // Un compte supprime laisse parfois son abonnement derriere lui. Rien a
      // prevenir, et rien a signaler comme echec.
      ignores++
      continue
    }

    const sub: SubscriptionEcheance = {
      id: ligne.id,
      periodEnd: ligne.current_period_end,
      status: ligne.status,
      cancelAtPeriodEnd: !!ligne.cancel_at_period_end,
      planName: plan?.name ?? 'Nexora',
      price: Number(plan?.price ?? 0),
      email,
      userName: compte?.user?.user_metadata?.full_name ?? null,
    }

    const kind = reminderFor(sub, maintenant)
    if (!kind) {
      ignores++
      continue
    }

    /*
     * On note l'envoi AVANT d'envoyer.
     *
     * La contrainte unique sur (abonnement, echeance, sorte) fait de cette
     * insertion le verrou : si elle echoue, le rappel est deja parti et on
     * passe. Dans l'autre ordre, un envoi reussi suivi d'une insertion
     * echouee renverrait le message chaque jour jusqu'a l'echeance.
     *
     * Le prix de ce choix est qu'une panne de Resend juste apres consomme le
     * rappel sans l'envoyer. C'est le moindre mal : rater un avertissement
     * est desagreable, en envoyer huit fait resilier.
     */
    const { error: dejaVu } = await supabase
      .from('subscription_reminders')
      .insert({
        subscription_id: sub.id,
        period_end: sub.periodEnd,
        kind,
      })

    if (dejaVu) {
      ignores++
      continue
    }

    try {
      await sendReminder(sub, kind)
      envoyes++
    } catch (e) {
      echecs.push(sub.id)
      console.error(
        `[rappels] envoi a l'abonnement ${sub.id}:`,
        e instanceof Error ? e.message : String(e),
      )
    }
  }

  return NextResponse.json({
    examines: lignes.length,
    envoyes,
    ignores,
    echecs: echecs.length,
  })
}
