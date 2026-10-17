import { Resend } from 'resend'
import { APP_URL } from '@/lib/appUrl'

export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Adresse d'expedition.
 *
 * nexoracoding.com est verifie chez Resend (DKIM, SPF et retour de plainte
 * poses sur le sous-domaine `send`). Avant cela tout partait de
 * onboarding@resend.dev, le domaine de test partage : un client qui demandait
 * la reinitialisation de son mot de passe recevait un message d'un domaine
 * inconnu, promis aux indesirables.
 */
export const FROM_EMAIL = 'Nexora <noreply@nexoracoding.com>'

/**
 * Pied de page commun. L'annee etait ecrite en dur et avait vieilli ; un
 * message de 2026 affichant 2025 donne l'impression d'un service a l'abandon.
 */
const footer = () =>
  `<p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} Nexora. All rights reserved.</p>`

export async function sendPaymentConfirmation({
  to,
  userName,
  planName,
  amount,
  cardLast4,
}: {
  to: string
  userName: string
  planName: string
  amount: string
  cardLast4: string
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `✅ Payment confirmed — ${planName} plan`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Payment confirmed</h2>
        <p>Hi ${userName},</p>
        <p>Your payment went through.</p>
        <div style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 4px 0;"><strong>Plan:</strong> ${planName}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> ${amount}</p>
          <p style="margin: 4px 0;"><strong>Card:</strong> •••• ${cardLast4}</p>
        </div>
        <p>Your subscription is now active. Everything in your plan is ready to use.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${APP_URL}/dashboard" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open dashboard</a>
        </div>
        ${footer()}
      </div>
    `,
  })
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetLink,
}: {
  to: string
  userName: string
  resetLink: string
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: '🔑 Reset your Nexora password',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Reset your password</h2>
        <p>Hi ${userName},</p>
        <p>You asked to reset your password. Use the button below to choose a new one:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset my password</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This link expires in 1 hour. If you did not ask for this, you can ignore this email — your password stays unchanged.</p>
        ${footer()}
      </div>
    `,
  })
}

export async function sendWelcomeEmail({
  to,
  userName,
}: {
  to: string
  userName: string
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: '🚀 Welcome to Nexora',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Welcome, ${userName}</h2>
        <p>Your Nexora account is ready.</p>
        <p>Here is where to start:</p>
        <ul style="color: #cbd5e1;">
          <li>💬 Install Nexora in VS Code, JetBrains or the CLI</li>
          <li>⚡ Let the agent read your project and write code with you</li>
          <li>🔑 Generate an API key from your dashboard</li>
        </ul>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${APP_URL}/dashboard" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get started</a>
        </div>
        ${footer()}
      </div>
    `,
  })
}
