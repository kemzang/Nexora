import { resend, FROM_EMAIL } from '@/lib/resend'
import { STARTUP_PROGRAM, type StartupEligibility } from '@/lib/leads'

/** Boite ou arrivent les demandes commerciales. */
const SALES_INBOX = process.env.SALES_INBOX_EMAIL || 'contact@nexoracoding.com'

const esc = (s: unknown) =>
  String(s ?? '—').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

const row = (label: string, value: unknown) =>
  `<tr><td style="padding:6px 14px 6px 0;color:#64748b;white-space:nowrap">${label}</td>
       <td style="padding:6px 0;color:#0f172a"><strong>${esc(value)}</strong></td></tr>`

const shell = (title: string, badge: string, badgeColor: string, body: string) => `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${badgeColor};
              color:#fff;font-size:12px;font-weight:600;letter-spacing:.04em">${badge}</div>
  <h1 style="font-size:20px;margin:14px 0 18px;color:#0f172a">${title}</h1>
  <table style="border-collapse:collapse;font-size:14px;width:100%">${body}</table>
</div>`

export async function notifyEnterpriseLead(lead: {
  id: string
  company_name: string; company_website: string; company_size: string; country: string
  contact_name: string; contact_role: string | null; work_email: string; phone: string | null
  developers: number | null; ides: string[]; timeline: string | null
  requirements: string[]; message: string | null
  domainMatches: boolean
}) {
  const html = shell(
    `${esc(lead.company_name)} — enterprise enquiry`,
    'ENTERPRISE', '#7c3aed',
    [
      row('Company', lead.company_name),
      row('Website', lead.company_website),
      row('Size', lead.company_size),
      row('Country', lead.country),
      row('Contact', `${lead.contact_name}${lead.contact_role ? ` — ${lead.contact_role}` : ''}`),
      row('Email', lead.work_email),
      row('Email matches website', lead.domainMatches ? 'yes' : 'NO — verify'),
      row('Phone', lead.phone),
      row('Developers', lead.developers),
      row('IDEs', lead.ides.join(', ') || '—'),
      row('Timeline', lead.timeline),
      row('Requirements', lead.requirements.join(', ') || '—'),
      lead.message
        ? `<tr><td colspan="2" style="padding:16px 0 0">
             <div style="color:#64748b;font-size:13px;margin-bottom:6px">Message</div>
             <div style="white-space:pre-wrap;color:#0f172a;background:#f8fafc;
                         border-radius:8px;padding:12px">${esc(lead.message)}</div></td></tr>`
        : '',
    ].join(''),
  )
  return resend.emails.send({
    from: FROM_EMAIL,
    to: SALES_INBOX,
    replyTo: lead.work_email,
    subject: `Enterprise enquiry — ${lead.company_name}`,
    html,
  })
}

export async function notifyStartupApplication(app: {
  id: string
  company_name: string; company_website: string; country: string
  founded_year: number; team_size: number; funding_stage: string; funding_amount: string | null
  contact_name: string; contact_role: string | null; work_email: string
  requested_plan: string; proof_type: string; proof_url: string | null; message: string | null
  eligibility: StartupEligibility
  domainMatches: boolean
}) {
  const verdict = app.eligibility.eligible
    ? 'Meets the published criteria'
    : `Outside criteria — ${app.eligibility.reasons.join('; ')}`

  const html = shell(
    `${esc(app.company_name)} — startup application`,
    app.eligibility.eligible ? 'STARTUP · ELIGIBLE' : 'STARTUP · REVIEW',
    app.eligibility.eligible ? '#059669' : '#d97706',
    [
      row('Company', app.company_name),
      row('Website', app.company_website),
      row('Country', app.country),
      row('Founded', app.founded_year),
      row('Team size', app.team_size),
      row('Funding', `${app.funding_stage}${app.funding_amount ? ` — ${app.funding_amount}` : ''}`),
      row('Contact', `${app.contact_name}${app.contact_role ? ` — ${app.contact_role}` : ''}`),
      row('Email', app.work_email),
      row('Email matches website', app.domainMatches ? 'yes' : 'NO — verify'),
      row('Requested plan', app.requested_plan),
      row('Proof', `${app.proof_type}${app.proof_url ? ` — ${app.proof_url}` : ''}`),
      row('Automatic check', verdict),
      row('If approved', `${STARTUP_PROGRAM.discountPercent}% for ${STARTUP_PROGRAM.durationMonths} months`),
      app.message
        ? `<tr><td colspan="2" style="padding:16px 0 0">
             <div style="color:#64748b;font-size:13px;margin-bottom:6px">Message</div>
             <div style="white-space:pre-wrap;color:#0f172a;background:#f8fafc;
                         border-radius:8px;padding:12px">${esc(app.message)}</div></td></tr>`
        : '',
    ].join(''),
  )
  return resend.emails.send({
    from: FROM_EMAIL,
    to: SALES_INBOX,
    replyTo: app.work_email,
    subject: `Startup application — ${app.company_name}`,
    html,
  })
}
