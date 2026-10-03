import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Nexora',
  description: 'How Nexora collects, uses and protects your personal data.',
}

const SECTIONS = [
  { id: 'data', label: '1. Data we collect' },
  { id: 'purposes', label: '2. Purposes' },
  { id: 'payment', label: '3. Payment' },
  { id: 'cookies', label: '4. Cookies & local storage' },
  { id: 'subprocessors', label: '5. Third-party providers' },
  { id: 'retention', label: '6. Data retention' },
  { id: 'security', label: '7. Security' },
  { id: 'rights', label: '8. Your rights' },
  { id: 'minors', label: '9. Minors' },
  { id: 'changes', label: '10. Changes' },
  { id: 'contact', label: '11. Contact' },
]

const SUBPROCESSORS = [
  { name: 'Supabase', role: "Database hosting, authentication and storage of the user account." },
  { name: 'Paddle', role: "Merchant of Record: handles card payments, international VAT/taxes and invoicing. Nexora does not store your card details." },
  { name: 'Resend', role: "Sending transactional emails (payment confirmation, account notifications)." },
  { name: 'Upstash', role: "Technical cache used for rate limiting (abuse prevention) and quota consistency." },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
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
              This policy explains what data Nexora collects when you use our IDE extension, our CLI, our website and
              our dashboard (together, the &laquo;&nbsp;Service&nbsp;&raquo;), why we collect it, and the choices
              available to you. The Service is operated by Bryan Teumena, trading as Nexora, a sole trader
              established in Cameroon.
            </p>

            <section id="data" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">1. Data we collect</h2>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground/80 font-medium">Account</strong>: email address, display name, preferred language.</li>
                <li><strong className="text-foreground/80 font-medium">Subscription &amp; billing</strong>: plan subscribed to, payment history (handled by Paddle, see section 5).</li>
                <li><strong className="text-foreground/80 font-medium">Use of the Service</strong>: volume of tokens consumed per request, AI model used and timestamp &mdash; needed to compute your quota and to bill you. The content of your conversations and your code is transmitted to the AI models to generate a response, but is not retained by Nexora beyond what is necessary to operate the Service.</li>
                <li><strong className="text-foreground/80 font-medium">Extension preferences</strong>: settings saved in the IDE extension (preferred model, and the like).</li>
                <li><strong className="text-foreground/80 font-medium">API keys</strong>: if you generate API keys from the dashboard to authenticate the extension or the CLI.</li>
              </ul>
            </section>

            <section id="purposes" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">2. Purposes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use this data to: provide and maintain the Service, authenticate your account, compute your credit
                consumption and enforce your plan limits, process payments, keep the Service secure (rate
                limiting, abuse detection), and respond to your support requests.
              </p>
            </section>

            <section id="payment" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">3. Payment</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Payments are processed by our provider Paddle, acting as Merchant of Record, which handles your card
                details directly along with applicable VAT and taxes. Nexora has no access to your full card
                number and does not store it on its servers.
              </p>
            </section>

            <section id="cookies" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">4. Cookies &amp; local storage</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The website uses your browser&apos;s local storage (localStorage) for strictly functional purposes:
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside mb-3">
                <li>Keeping you signed in;</li>
                <li>Remembering your preferred display language;</li>
                <li>Remembering your light / dark display preference.</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We do not use advertising cookies or third-party trackers for commercial or profiling purposes.
              </p>
            </section>

            <section id="subprocessors" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">5. Third-party providers</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                We rely on the following technical providers to operate the Service:
              </p>
              <div className="space-y-2.5">
                {SUBPROCESSORS.map(p => (
                  <div key={p.name} className="p-3.5 rounded-xl bg-white/[0.03] border border-border/50">
                    <p className="text-sm font-semibold mb-0.5">{p.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.role}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Depending on the AI model or models your request calls on (DeepSeek, Gemini or Claude), the content
                needed to generate the response is transmitted to the corresponding model provider.
              </p>
            </section>

            <section id="retention" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">6. Data retention</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account and usage data are kept for as long as your account is active. If you request deletion of
                your account, we delete or anonymise your personal data within a reasonable period, subject to
                any legal retention obligations (notably accounting ones) that may apply to certain billing
                records.
              </p>
            </section>

            <section id="security" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">7. Security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Exchanges with the Service are encrypted in transit (TLS). Access to your account is protected by
                Supabase&apos;s authentication mechanisms, and access to your data by our team is limited to what
                is necessary to operate and secure the Service.
              </p>
            </section>

            <section id="rights" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">8. Your rights</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whatever your country of residence, you can contact us to request access to, correction of or deletion
                of your personal data, or to obtain an export of your account data. To exercise these rights,
                write to us at{' '}
                <a href="mailto:contact@nexoracoding.com" className="text-foreground/80 hover:text-foreground underline underline-offset-4">contact@nexoracoding.com</a>.
              </p>
            </section>

            <section id="minors" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">9. Minors</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Service is not directed at people under 16. We do not knowingly collect data concerning minors
                under 16.
              </p>
            </section>

            <section id="changes" className="mb-9 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">10. Changes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This policy may be updated to reflect changes in the Service or in applicable regulation. The
                last-updated date at the top of this page reflects the version in force.
              </p>
            </section>

            <section id="contact" className="mb-2 scroll-mt-24">
              <h2 className="text-lg font-bold mb-3">11. Contact</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For any question about this policy or your personal data, contact us at{' '}
                <a href="mailto:contact@nexoracoding.com" className="text-foreground/80 hover:text-foreground underline underline-offset-4">contact@nexoracoding.com</a>{' '}
                or visit our <Link href="/contact" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Contact</Link>.
              </p>
            </section>
          </article>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
