import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Utilise onboarding@resend.dev tant que tu n'as pas de domaine vérifié
const FROM_EMAIL = 'Nexora <onboarding@resend.dev>'

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
    subject: `✅ Paiement confirmé — Plan ${planName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Paiement confirmé !</h2>
        <p>Bonjour ${userName},</p>
        <p>Votre paiement a été traité avec succès.</p>
        <div style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 4px 0;"><strong>Plan :</strong> ${planName}</p>
          <p style="margin: 4px 0;"><strong>Montant :</strong> ${amount}</p>
          <p style="margin: 4px 0;"><strong>Carte :</strong> •••• ${cardLast4}</p>
        </div>
        <p>Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités de Nexora !</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accéder au Dashboard</a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© 2025 Nexora. Tous droits réservés.</p>
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
    subject: '🔑 Réinitialisation de votre mot de passe — Nexora',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${userName},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau :</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© 2025 Nexora. Tous droits réservés.</p>
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
    subject: '🚀 Bienvenue sur Nexora !',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Bienvenue ${userName} !</h2>
        <p>Votre compte Nexora a été créé avec succès.</p>
        <p>Voici ce que vous pouvez faire maintenant :</p>
        <ul style="color: #cbd5e1;">
          <li>💬 Utiliser le Chat IA dans VS Code</li>
          <li>⚡ Profiter de l'auto-complétion intelligente</li>
          <li>🔑 Générer votre clé API</li>
        </ul>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Commencer</a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© 2025 Nexora. Tous droits réservés.</p>
      </div>
    `,
  })
}
