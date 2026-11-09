/**
 * @file Rappels avant prelevement ou fin d'abonnement.
 *
 * Un abonnement se renouvelait en silence : l'utilisateur decouvrait le debit
 * sur son releve. C'est ce qui fait resilier et demander un remboursement,
 * meme quand le service plaisait — le grief porte sur l'absence de choix,
 * pas sur le montant.
 *
 * Le choix de conception qui compte est la FENETRE. On ne cherche pas les
 * abonnements dont l'echeance tombe exactement a J-7 : une tache quotidienne
 * qui ne tourne pas ce jour-la — Vercel ne garantit pas l'heure, et le plan
 * Hobby encore moins — raterait le rappel pour toujours. On balaie donc tout
 * ce qui echoit dans les huit prochains jours, et c'est la table
 * subscription_reminders qui empeche de renvoyer. Un jour manque se rattrape
 * le lendemain.
 */
import { APP_URL } from '@/lib/appUrl'
import { FROM_EMAIL, resend } from '@/lib/resend'

/** Au moins une semaine, comme promis a l'utilisateur. */
export const JOURS_AVANT = 7

/**
 * Un jour de marge au-dela des sept promis.
 *
 * Sans elle, un abonnement qui echoit dans 7,4 jours n'entre pas dans la
 * fenetre aujourd'hui, et demain il n'y sera plus que dans 6,4 jours : le
 * rappel partirait a J-6, donc en retard sur la promesse. La marge garantit
 * que chaque echeance est vue au moins une fois a J-7 ou avant.
 */
export const FENETRE_JOURS = JOURS_AVANT + 1

export type ReminderKind = 'renewal' | 'expiry'

export interface SubscriptionEcheance {
  id: string
  periodEnd: string
  status: string
  cancelAtPeriodEnd: boolean
  planName: string
  /** Prix mensuel en dollars. 0 = plan gratuit. */
  price: number
  email: string
  userName?: string | null
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[<>&]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!,
  )

/**
 * Faut-il un rappel pour cet abonnement, et lequel ?
 *
 * `null` = non. Separe de l'envoi pour etre verifiable sans base ni reseau :
 * c'est la seule partie ou une erreur se paie en messages envoyes a tort, ou
 * en silence la ou on avait promis un avertissement.
 */
export function reminderFor(
  sub: SubscriptionEcheance,
  maintenant: Date,
): ReminderKind | null {
  if (sub.status !== 'active') return null

  // Un plan gratuit ne prelevera rien et n'expire pas : annoncer une echeance
  // inquieterait sans raison.
  if (!(sub.price > 0)) return null

  const fin = new Date(sub.periodEnd)
  if (Number.isNaN(fin.getTime())) return null

  // Une echeance deja passee ne s'annonce plus. Elle veut dire que le webhook
  // de renouvellement n'est pas arrive, ce qui est un autre probleme — pas
  // quelque chose a dire a l'utilisateur.
  if (fin <= maintenant) return null

  const limite = new Date(maintenant.getTime() + FENETRE_JOURS * 86_400_000)
  if (fin > limite) return null

  return sub.cancelAtPeriodEnd ? 'expiry' : 'renewal'
}

/** Le jour de l'echeance, en clair, dans la langue du produit. */
function jour(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function coque(titre: string, corps: string): string {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
          <span style="font-size: 28px;">🧠</span>
        </div>
        <h1 style="color: white; margin-top: 16px;">Nexora</h1>
      </div>
      <h2 style="color: #a78bfa;">${titre}</h2>
      ${corps}
      <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} Nexora. All rights reserved.</p>
    </div>
  `
}

const bouton = (href: string, texte: string) => `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${href}" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">${texte}</a>
  </div>
`

/**
 * Compose le message. Les deux sortes disent le contraire l'une de l'autre,
 * donc elles ne partagent que la coque.
 *
 * Dans les deux cas le message dit le montant, la date, et porte le lien qui
 * permet de changer d'avis. Un rappel qui annonce un debit sans dire comment
 * l'arreter n'est pas un service rendu, c'est un avis de passage.
 */
export function composeReminder(sub: SubscriptionEcheance, kind: ReminderKind) {
  const nom = sub.userName ? esc(sub.userName) : 'there'
  const date = jour(sub.periodEnd)
  const lien = `${APP_URL}/dashboard`

  if (kind === 'renewal') {
    return {
      subject: `Your ${sub.planName} plan renews on ${date.split(', ').slice(1).join(', ')}`,
      html: coque(
        'A heads-up before your next payment',
        `
          <p>Hi ${nom},</p>
          <p>Your <strong>${esc(sub.planName)}</strong> plan renews automatically on
             <strong>${date}</strong>, and <strong>$${sub.price}</strong> will be charged
             to your payment method on file.</p>
          <p>Nothing to do if you want to carry on — this is just so the charge is not a
             surprise.</p>
          <p>If you would rather stop, you can turn off automatic renewal from your
             dashboard. You keep your access until ${date} either way.</p>
          ${bouton(lien, 'Manage my subscription')}
          <p style="color: #94a3b8; font-size: 14px;">You are getting this a week ahead on
             purpose, so there is time to decide.</p>
        `,
      ),
    }
  }

  return {
    subject: `Your ${sub.planName} access ends on ${date.split(', ').slice(1).join(', ')}`,
    html: coque(
      'Your plan is about to end',
      `
        <p>Hi ${nom},</p>
        <p>Automatic renewal is off, so your <strong>${esc(sub.planName)}</strong> access
           ends on <strong>${date}</strong>. You will not be charged.</p>
        <p>After that date your account falls back to the Free plan — your conversations
           and settings stay, but the paid models and the larger credit allowance stop.</p>
        <p>If you changed your mind, you can turn renewal back on before ${date} and
           nothing will be interrupted.</p>
        ${bouton(lien, 'Resume my subscription')}
      `,
    ),
  }
}

/** Envoie le rappel. Separe pour que la composition reste testable. */
export async function sendReminder(
  sub: SubscriptionEcheance,
  kind: ReminderKind,
) {
  const { subject, html } = composeReminder(sub, kind)
  return resend.emails.send({ from: FROM_EMAIL, to: sub.email, subject, html })
}
