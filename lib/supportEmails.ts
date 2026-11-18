import { FROM_EMAIL, emailHeader, esc, resend } from './resend'
import { categoryById } from './supportTickets'

/**
 * Les deux courriels d'un ticket.
 *
 * Ce sont des NOTIFICATIONS, pas le dossier : celui-ci est la ligne en base.
 * Si Resend tombe ou si un message part en indesirable, le ticket existe
 * quand meme et reste visible dans le tableau de bord. C'est l'inverse de ce
 * qu'on avait avant, ou un `mailto:` perdu en route l'etait pour toujours.
 */

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || 'support@nexoracoding.com'

/** Delai annonce. Tenable, donc tenu — une promesse ratee fait plus de degats qu'une absence de promesse. */
export const SUPPORT_SLA = 'within 2 business days'

function ligne(label: string, valeur: string): string {
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:13px">${esc(valeur)}</td>
    </tr>`
}

/** Confirmation a l'utilisateur : il repart avec une preuve, pas un « message envoye » qui s'evapore. */
export async function sendTicketConfirmation(ticket: {
  reference: string
  email: string
  category: string
  subject: string
  message: string
}) {
  const categorie = categoryById(ticket.category)?.title ?? ticket.category
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        ${emailHeader()}
        <div style="padding:28px">
          <p style="margin:0 0 18px;color:#0f172a;font-size:15px">
            We received your request. Here is your reference:
          </p>
          <p style="margin:0 0 24px;font-size:26px;font-weight:700;letter-spacing:1px;color:#0f172a">
            ${esc(ticket.reference)}
          </p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
            We reply ${SUPPORT_SLA}. Keep this reference — quoting it lets us
            find your request straight away.
          </p>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;padding-top:16px">
            ${ligne('Type', categorie)}
            ${ligne('Subject', ticket.subject)}
          </table>
          <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;color:#334155;font-size:13px;white-space:pre-wrap">${esc(
            ticket.message,
          )}</div>
        </div>
      </div>
    </div>`

  // Jamais bloquant : un envoi rate ne doit pas faire echouer la creation du
  // ticket, qui est deja enregistre.
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ticket.email,
      replyTo: SUPPORT_INBOX,
      subject: `[${ticket.reference}] We received your request`,
      html,
    })
  } catch (e) {
    console.error('[support] confirmation non envoyee:', e)
  }
}

/** Notification a l'equipe, avec tout le contexte deja rassemble. */
export async function notifySupportTicket(ticket: {
  reference: string
  email: string
  category: string
  subject: string
  message: string
  context: Record<string, unknown>
}) {
  const categorie = categoryById(ticket.category)?.title ?? ticket.category
  const contexte = Object.entries(ticket.context)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ligne(k, typeof v === 'string' ? v : JSON.stringify(v)))
    .join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;background:#f8fafc">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;letter-spacing:1px">${esc(
          categorie.toUpperCase(),
        )}</p>
        <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">${esc(ticket.reference)} — ${esc(
          ticket.subject,
        )}</h2>
        <table style="width:100%;border-collapse:collapse">
          ${ligne('From', ticket.email)}
          ${contexte}
        </table>
        <div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;color:#0f172a;font-size:14px;white-space:pre-wrap">${esc(
          ticket.message,
        )}</div>
      </div>
    </div>`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_INBOX,
      replyTo: ticket.email,
      subject: `[${ticket.reference}] ${categorie} — ${ticket.subject}`,
      html,
    })
  } catch (e) {
    console.error('[support] notification non envoyee:', e)
  }
}
