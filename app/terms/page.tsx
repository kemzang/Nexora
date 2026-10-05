import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'Terms of Use — Nexora',
  description: 'Terms and conditions governing the use of the Nexora service.',
}

const SECTIONS = [
  { id: 'identity', label: '1. Who we are' },
  { id: 'purpose', label: '2. Purpose' },
  { id: 'account', label: '3. User account' },
  { id: 'subscriptions', label: '4. Subscriptions & payment' },
  { id: 'use', label: '5. Permitted use' },
  { id: 'ai', label: '6. AI-generated suggestions' },
  { id: 'ip', label: '7. Intellectual property' },
  { id: 'liability', label: '8. Limitation of liability' },
  { id: 'termination', label: '9. Termination' },
  { id: 'changes', label: '10. Changes to these terms' },
  { id: 'law', label: '11. Governing law' },
  { id: 'contact', label: '12. Contact' },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Terms of Use</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: 3 October 2026</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="space-y-1 sticky top-24">
              {SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`} className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] rounded-lg transition-colors">
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="flex-1 min-w-0 max-w-2xl">
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              These terms of use (the &laquo;&nbsp;Terms&nbsp;&raquo;) govern access to and use of the Nexora
              service &mdash; the artificial intelligence extension for code editors (VS Code, JetBrains IDEs)
              and its command-line interface, together with the associated website and dashboard (collectively,
              the &laquo;&nbsp;Service&nbsp;&raquo;). By creating an account or using the Service, you agree to
              these Terms.
            </p>

            <section id="identity" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">1. Who we are</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Service is operated by <strong className="text-foreground/90">Kemzang Teumena Stephane Bryan</strong>, trading
                as <strong className="text-foreground/90">Nexora</strong>, a sole trader established in Cameroon.
                Kemzang Teumena Stephane Bryan is the contracting party under these Terms and the seller of the subscriptions
                described below.
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Legal name: Kemzang Teumena Stephane Bryan</li>
                <li>Trading name: Nexora</li>
                <li>Legal form: sole trader (entreprise individuelle)</li>
                <li>Country of establishment: Cameroon</li>
                <li>
                  Contact:{' '}
                  <a href="mailto:contact@nexoracoding.com" className="text-foreground/80 hover:text-foreground underline underline-offset-4">contact@nexoracoding.com</a>
                </li>
              </ul>
            </section>

            <section id="purpose" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">2. Purpose</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nexora provides access to third-party artificial intelligence models (DeepSeek, Gemini, Claude,
                depending on your plan) through an integrated chat, code autocomplete, an Agent mode and inline
                editing, available from an IDE extension or a command-line interface. Access to features and
                models depends on the plan you subscribe to &mdash; see the{' '}
                <Link href="/pricing" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Pricing</Link> page.
              </p>
            </section>

            <section id="account" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">3. User account</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Using the Service requires creating an account. You are responsible for the accuracy of the
                information you provide and for keeping your credentials confidential. Any activity carried out
                from your account is deemed to have been carried out by you.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You must inform us without delay of any unauthorised use of your account by contacting us (see
                section 12).
              </p>
            </section>

            <section id="subscriptions" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">4. Subscriptions &amp; payment</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Nexora offers a free plan as well as several paid plans billed monthly, detailed on the{' '}
                <Link href="/pricing" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Pricing</Link> page.
                Each plan grants a monthly credit allowance, a number of requests per day and a maximum number of
                collaborators. Unused credits do not carry over from one month to the next.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Payments are processed by our third-party provider Paddle, acting as Merchant of Record for card
                transactions. Nexora does not store your card details.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Once your monthly credit allowance is reached, access to AI features is suspended until your
                billing period renews or until you upgrade to a higher plan, which you can do at any time from
                your dashboard. For any question about billing or cancellation, contact our support (section 12).
                Refund conditions are set out on a dedicated page:{' '}
                <Link href="/refund" className="underline hover:text-foreground">refund policy</Link>.
              </p>
            </section>

            <section id="use" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">5. Permitted use</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside mb-3">
                <li>Resell, sublicense or redistribute access to the Service without authorisation;</li>
                <li>Circumvent or attempt to circumvent the quotas, rate limits or security measures of the Service;</li>
                <li>Use the Service for unlawful purposes or to produce illegal, malicious or harmful content;</li>
                <li>Disrupt the operation of the Service or extract its data in an automated way outside the intended use.</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Service includes automatic detection measures intended to limit the execution of dangerous
                commands suggested by the AI (file deletion, data exfiltration, and the like). These measures
                reduce the risk but do not eliminate it: you remain responsible for reviewing any action or
                command before running it.
              </p>
            </section>

            <section id="ai" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">6. AI-generated suggestions</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Code, explanations and suggestions produced by the AI models available through Nexora are
                provided for guidance only and may contain errors, approximations or inappropriate content. You
                are solely responsible for reviewing, testing and validating any generated code or content before
                using it, particularly in a production environment.
              </p>
            </section>

            <section id="ip" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">7. Intellectual property</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You retain all rights in your source code and your data. Nexora claims no ownership over the
                content you create or process through the Service. The Service itself (brand, interface,
                software) remains the property of Nexora and its licensors.
              </p>
            </section>

            <section id="liability" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">8. Limitation of liability</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Service is provided &laquo;&nbsp;as is&nbsp;&raquo;, without warranty of continuous
                availability, accuracy of AI responses or freedom from error, save for any specific commitments
                agreed contractually with Enterprise plan customers. To the extent permitted by applicable law,
                Nexora shall not be liable for indirect damages arising from use of the Service or of code
                generated by the AI.
              </p>
            </section>

            <section id="termination" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">9. Termination</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You may stop using the Service and request closure of your account at any time by contacting us.
                Nexora reserves the right to suspend or terminate access to an account in the event of a manifest
                breach of these Terms.
              </p>
            </section>

            <section id="changes" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">10. Changes to these terms</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These Terms may change to reflect changes made to the Service. The last-updated date at the top
                of this page allows you to track revisions. We encourage you to consult it periodically.
              </p>
            </section>

            <section id="law" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">11. Governing law</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of Cameroon. Failing an amicable resolution, any dispute
                relating to their formation, interpretation or performance falls within the exclusive
                jurisdiction of the courts of Yaoundé, Cameroon.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                If you contract as a consumer and reside in a country whose law grants you protections that
                cannot be derogated from by contract, those protections remain available to you and this clause
                shall not deprive you of them.
              </p>
            </section>

            <section id="contact" className="mb-2 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">12. Contact</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For any question about these Terms, contact us at{' '}
                <a href="mailto:contact@nexoracoding.com" className="text-foreground/80 hover:text-foreground underline underline-offset-4">contact@nexoracoding.com</a>{' '}
                or visit our <Link href="/contact" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Contact</Link> page.
              </p>
            </section>
          </article>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
