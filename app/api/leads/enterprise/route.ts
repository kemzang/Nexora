import { NextRequest, NextResponse } from 'next/server'
import {
  checkWorkEmail, emailMatchesSite, siteDomain,
  COMPANY_SIZES, TIMELINES, REQUIREMENTS, IDES,
} from '@/lib/leads'
import { adminClient, clientIp, tooManyAttempts, tooManySubmissions, recordSubmission, bad } from '../route-helpers'
import { notifyEnterpriseLead } from '@/lib/leadEmails'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Champ piège : invisible à l'écran, rempli uniquement par un robot.
    if (body.website_url) return NextResponse.json({ success: true })

    const rlKey = `lead:ent:${clientIp(req)}`
    if (await tooManyAttempts(rlKey) || await tooManySubmissions(rlKey)) {
      return bad('Too many requests. Please try again later.', 429)
    }

    const required = ['companyName', 'companyWebsite', 'companySize', 'country', 'contactName', 'workEmail']
    for (const f of required) {
      if (!body[f] || String(body[f]).trim().length < 2) return bad(`Missing field: ${f}`)
    }

    const email = checkWorkEmail(body.workEmail)
    if (!email.ok) {
      return bad(
        email.reason === 'free'
          ? 'Please use your work email address, not a personal one.'
          : email.reason === 'disposable'
            ? 'Disposable email addresses are not accepted.'
            : 'This email address is not valid.',
      )
    }
    if (!siteDomain(body.companyWebsite)) return bad('Please enter a valid company website.')
    if (!COMPANY_SIZES.includes(body.companySize)) return bad('Invalid company size.')
    if (body.timeline && !TIMELINES.includes(body.timeline)) return bad('Invalid timeline.')

    const keep = <T extends readonly string[]>(arr: unknown, allowed: T) =>
      Array.isArray(arr) ? arr.filter((v) => allowed.includes(v as T[number])) : []

    const row = {
      company_name: String(body.companyName).trim().slice(0, 200),
      company_website: String(body.companyWebsite).trim().slice(0, 300),
      company_size: body.companySize,
      country: String(body.country).trim().slice(0, 100),
      contact_name: String(body.contactName).trim().slice(0, 200),
      contact_role: body.contactRole ? String(body.contactRole).trim().slice(0, 200) : null,
      work_email: String(body.workEmail).trim().toLowerCase().slice(0, 300),
      phone: body.phone ? String(body.phone).trim().slice(0, 50) : null,
      developers: Number.isFinite(+body.developers) ? Math.max(1, Math.min(100000, Math.floor(+body.developers))) : null,
      ides: keep(body.ides, IDES),
      timeline: body.timeline || null,
      requirements: keep(body.requirements, REQUIREMENTS),
      message: body.message ? String(body.message).trim().slice(0, 4000) : null,
    }

    const { data, error } = await adminClient()
      .from('enterprise_leads').insert(row).select('id').single()
    if (error) {
      console.error('[enterprise lead] insert failed', error)
      return bad('Could not record your request. Please try again.', 500)
    }

    // L'envoi est attendu, pas lance en arriere-plan : sur Vercel la fonction
    // est gelee des que la reponse part, et un `void promise` n'a jamais le
    // temps de s'executer — les notifications ne partaient pas du tout. Le
    // try/catch garde le comportement voulu : un echec d'e-mail ne doit pas
    // faire echouer la demande, qui est deja enregistree.
    try {
      await notifyEnterpriseLead({
        ...row,
        id: data.id,
        domainMatches: emailMatchesSite(row.work_email, row.company_website),
      })
    } catch (e) {
      console.error('[enterprise lead] notification failed', e)
    }

    await recordSubmission(rlKey)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[enterprise lead] unexpected', err)
    return bad('Unexpected error.', 500)
  }
}
