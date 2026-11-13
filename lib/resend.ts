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
/**
 * Echappe une valeur avant de l'inserer dans le HTML d'un message.
 *
 * Les noms viennent du profil, donc de l'utilisateur. orgEmails.ts le faisait
 * deja ; ici les trois gabarits inseraient la valeur brute. Le risque n'est
 * pas le navigateur du lecteur, c'est la reputation du domaine : du balisage
 * injecte part signe noreply@nexoracoding.com.
 */
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[<>&]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!,
  )

export const FROM_EMAIL = 'Nexora <noreply@nexoracoding.com>'

/**
 * Pied de page commun. L'annee etait ecrite en dur et avait vieilli ; un
 * message de 2026 affichant 2025 donne l'impression d'un service a l'abandon.
 */
const footer = () =>
  `<p style="color: #64748b; font-size: 12px; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} Nexora. All rights reserved.</p>`

/**
 * Entete commune a tous les messages.
 *
 * Elle affichait un emoji cerveau dans un carre degrade, pas le logo du
 * produit : un client recevait donc une confirmation de paiement signee d'un
 * dessin qui n'existe nulle part ailleurs dans Nexora.
 *
 * L'image est appelee par URL absolue, seule forme qu'un client de messagerie
 * sache charger — ni chemin relatif ni fichier joint. Le `alt` compte autant
 * que l'image : beaucoup de clients bloquent les images par defaut, et ce
 * texte est alors tout ce que le lecteur voit.
 */
export function emailHeader(): string {
  return `
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${APP_URL}/logo.png" width="64" height="64" alt="Nexora"
               style="display: inline-block; border-radius: 16px; border: 0; outline: none; text-decoration: none;" />
          <h1 style="color: white; margin-top: 16px;">Nexora</h1>
        </div>`
}

/**
 * Message de bienvenue apres un paiement.
 *
 * Il annoncait le paiement — plan, montant, carte — alors que Paddle envoie
 * deja son propre recu, avec l'identifiant de transaction et les mentions
 * legales. Le client recevait donc deux fois la meme chose, et la version
 * maison affichait en prime « Card: •••• •••• », l'appelant ne disposant
 * d'aucun numero a y mettre.
 *
 * Paddle est Merchant of Record : le recu lui appartient, et il le fait mieux.
 * Ce message ne garde donc que ce que Paddle ne peut pas dire, faute de
 * connaitre le produit — ou installer Nexora, et ce que le palier donne.
 *
 * C'est le seul moment ou l'on a l'attention de quelqu'un qui vient de payer.
 * Lui dire « tout est pret » sans lui dire ou aller, c'est preparer une
 * demande de remboursement.
 */

/** Une voie d'installation, dans un tableau : les div flottantes cassent sous Outlook. */
function installRow(title: string, subtitle: string, action: string): string {
  return `
      <tr>
        <td style="padding:14px 16px;border:1px solid rgba(139,92,246,.22);border-radius:12px;background:rgba(139,92,246,.07);">
          <div style="font-weight:600;color:#e9e4ff;font-size:14px;">${title}</div>
          <div style="color:#a0aec0;font-size:12px;margin-top:3px;">${subtitle}</div>
          <div style="margin-top:9px;">${action}</div>
        </td>
      </tr>
      <tr><td style="height:10px;"></td></tr>`
}

const installLink = (href: string, label: string) =>
  `<a href="${href}" style="color:#a78bfa;font-size:13px;font-weight:600;text-decoration:none;">${label} &rarr;</a>`

export async function sendPaymentConfirmation({
  to,
  userName,
  planName,
  credits,
  models,
}: {
  to: string
  userName: string
  planName: string
  /** Credits mensuels du palier, deja formates (« 4,000,000 »). */
  credits: string
  /** Les modeles inclus, en clair. */
  models: string
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    // Une reponse a noreply@ disparait sans bruit. Elle est redirigee ici vers
    // une adresse lue, pour qu'un client bloque ait une porte de sortie.
    replyTo: 'contact@nexoracoding.com',
    to,
    subject: `Welcome to Nexora ${esc(planName)} — here's how to start`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f0a1e; color: #e2e8f0; padding: 40px; border-radius: 16px;">
${emailHeader()}
        <h2 style="color:#a78bfa;margin-bottom:8px;">You're on ${esc(planName)}</h2>
        <p style="margin-top:0;">Hi ${esc(userName)},</p>
        <p>Your plan is active — <strong>${esc(credits)} credits a month</strong>, with ${esc(models)}.
           Paddle has sent your receipt separately.</p>

        <p style="margin-top:28px;margin-bottom:12px;font-weight:600;color:#e9e4ff;">Install Nexora</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${installRow(
  'VS Code, Cursor, Windsurf, VSCodium',
  'One click from the marketplace',
  installLink(
    'https://marketplace.visualstudio.com/items?itemName=nexoracoding.nexora-ai',
    'Install the extension',
  ),
)}
${installRow(
  'IntelliJ, PyCharm, WebStorm, and the rest',
  'From the JetBrains plugin marketplace',
  installLink('https://plugins.jetbrains.com/plugin/34609-nexora', 'Install the plugin'),
)}
${installRow(
  'Terminal',
  'If you would rather stay in the shell',
  '<code style="background:rgba(255,255,255,.07);padding:5px 9px;border-radius:6px;font-size:12px;color:#e9e4ff;">npm i -g @nexoracoding/cli</code>',
)}
        </table>

        <p style="font-size:13px;color:#a0aec0;">Sign in with <strong style="color:#e2e8f0;">this email address</strong>
           and your credits are already there. There is no API key to set up.</p>

        <div style="text-align:center;margin-top:32px;">
          <a href="${APP_URL}/dashboard" style="background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Open my dashboard</a>
        </div>

        <p style="font-size:13px;color:#a0aec0;text-align:center;margin-top:24px;">
          New here? The <a href="${APP_URL}/docs" style="color:#a78bfa;text-decoration:none;">docs</a>
          walk through the first steps. Anything not working —
          <a href="${APP_URL}/contact" style="color:#a78bfa;text-decoration:none;">get in touch</a>.
        </p>
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
${emailHeader()}
        <h2 style="color: #a78bfa;">Reset your password</h2>
        <p>Hi ${esc(userName)},</p>
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
${emailHeader()}
        <h2 style="color: #a78bfa;">Welcome, ${esc(userName)}</h2>
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
