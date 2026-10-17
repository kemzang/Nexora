/**
 * @file Invitations d'equipe.
 *
 * Le lien porte le jeton : l'invite n'a pas forcement de compte, et doit
 * pouvoir s'inscrire puis rejoindre l'equipe sans qu'on lui demande de
 * retrouver quoi que ce soit.
 */
import { APP_URL } from '@/lib/appUrl'
import { FROM_EMAIL, resend } from '@/lib/resend'

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[<>&]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!,
  )

export async function sendOrgInvite({
  to,
  orgName,
  token,
  role,
  inviterName,
}: {
  to: string
  orgName: string
  token: string
  role: 'owner' | 'admin' | 'member'
  inviterName?: string
}) {
  const link = `${APP_URL}/invite/${encodeURIComponent(token)}`
  const who = inviterName ? `${esc(inviterName)} invited you` : 'You are invited'
  const asRole =
    role === 'owner'
      ? 'as the owner of the team'
      : role === 'admin'
        ? 'as an administrator'
        : 'as a member'

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Join ${orgName} on Nexora`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 16px; border-radius: 16px;">
            <span style="font-size: 28px;">🧠</span>
          </div>
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>
        <h2 style="color: #a78bfa;">Join ${esc(orgName)}</h2>
        <p>${who} to join <strong>${esc(orgName)}</strong> on Nexora ${asRole}.</p>
        <p>Your team shares a common pool of credits, so you can start working straight away — no separate subscription needed.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept the invitation</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This invitation expires in 14 days. If you did not expect it, you can ignore this email.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} Nexora. All rights reserved.</p>
      </div>
    `,
  })
}
