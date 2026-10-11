import { NextRequest, NextResponse } from 'next/server'
import {
  checkWorkEmail, emailMatchesSite, siteDomain,
  checkStartupEligibility, STARTUP_PROGRAM,
  FUNDING_STAGES, PROOF_TYPES,
} from '@/lib/leads'
import { adminClient, clientIp, rateLimited, bad } from '../route-helpers'
import { notifyStartupApplication } from '@/lib/leadEmails'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.website_url) return NextResponse.json({ success: true })

    if (await rateLimited(`lead:startup:${clientIp(req)}`, 3, 3600)) {
      return bad('Too many requests. Please try again later.', 429)
    }

    const required = ['companyName', 'companyWebsite', 'country', 'contactName', 'workEmail', 'requestedPlan', 'proofType']
    for (const f of required) {
      if (!body[f] || String(body[f]).trim().length < 2) return bad(`Missing field: ${f}`)
    }

    const email = checkWorkEmail(body.workEmail)
    if (!email.ok) {
      return bad(
        email.reason === 'free'
          ? 'Please use your company email address, not a personal one.'
          : email.reason === 'disposable'
            ? 'Disposable email addresses are not accepted.'
            : 'This email address is not valid.',
      )
    }
    if (!siteDomain(body.companyWebsite)) return bad('Please enter a valid company website.')

    const year = new Date().getFullYear()
    const founded = +body.foundedYear
    if (!Number.isInteger(founded) || founded < 1900 || founded > year) {
      return bad('Please enter a valid founding year.')
    }
    const team = +body.teamSize
    if (!Number.isInteger(team) || team < 1 || team > 10000) {
      return bad('Please enter a valid team size.')
    }
    if (!FUNDING_STAGES.includes(body.fundingStage)) return bad('Invalid funding stage.')
    if (!PROOF_TYPES.includes(body.proofType)) return bad('Invalid proof type.')
    if (!STARTUP_PROGRAM.eligiblePlans.includes(body.requestedPlan)) {
      return bad('The program applies to the Pro and Business plans only.')
    }

    const eligibility = checkStartupEligibility({
      foundedYear: founded, teamSize: team, fundingStage: body.fundingStage,
    })

    const row = {
      company_name: String(body.companyName).trim().slice(0, 200),
      company_website: String(body.companyWebsite).trim().slice(0, 300),
      country: String(body.country).trim().slice(0, 100),
      founded_year: founded,
      team_size: team,
      funding_stage: body.fundingStage,
      funding_amount: body.fundingAmount ? String(body.fundingAmount).trim().slice(0, 100) : null,
      contact_name: String(body.contactName).trim().slice(0, 200),
      contact_role: body.contactRole ? String(body.contactRole).trim().slice(0, 200) : null,
      work_email: String(body.workEmail).trim().toLowerCase().slice(0, 300),
      requested_plan: body.requestedPlan,
      proof_type: body.proofType,
      proof_url: body.proofUrl ? String(body.proofUrl).trim().slice(0, 500) : null,
      message: body.message ? String(body.message).trim().slice(0, 4000) : null,
    }

    const { data, error } = await adminClient()
      .from('startup_applications').insert(row).select('id').single()
    if (error) {
      console.error('[startup application] insert failed', error)
      return bad('Could not record your application. Please try again.', 500)
    }

    void notifyStartupApplication({
      ...row,
      id: data.id,
      eligibility,
      domainMatches: emailMatchesSite(row.work_email, row.company_website),
    }).catch((e) => console.error('[startup application] notification failed', e))

    return NextResponse.json({ success: true, autoEligible: eligibility.eligible })
  } catch (err) {
    console.error('[startup application] unexpected', err)
    return bad('Unexpected error.', 500)
  }
}
