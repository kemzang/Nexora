import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'Refund Policy — Nexora',
  description: 'Refund and cancellation terms for Nexora subscriptions.',
}

/**
 * Page dediee a la politique de remboursement.
 *
 * Elle vivait dans une phrase des CGU — « ces situations sont traitees au cas
 * par cas » — ce qui n'est pas une politique : un client ne peut pas savoir a
 * quoi il a droit avant de payer, et un examinateur de prestataire de paiement
 * la compte comme absente. Les revues reclament une page distincte, avec un
 * delai et une procedure explicites.
 */
export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Refund Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: 3 October 2026
          </p>
        </div>

        <article className="max-w-2xl">
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Nexora is a monthly subscription service. A free tier lets you try
            the service without paying, and the terms below apply to paid
            subscriptions. Subscriptions are sold by Kemzang Teumena Stephane Bryan, trading as
            Nexora, a sole trader established in Cameroon.
          </p>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">1. Cooling-off period</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have <strong>14 days</strong> from your first payment to
              request a full refund of your subscription, with no need to give a
              reason. The refund is issued to the payment method used at
              purchase, within 5 to 10 business days depending on your bank.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">2. Renewals</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After that period, monthly instalments already paid are not
              refunded, as the service was delivered over the period concerned.
              You can cancel at any time to stop subsequent renewals.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">3. Cancellation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cancellation takes one click from your{' '}
              <Link href="/dashboard" className="underline hover:text-foreground">
                dashboard
              </Link>
              , in the Subscription section. No email is required. Your access
              remains active until the end of the period already paid for, then
              switches automatically to the free tier &mdash; your account and
              your data are kept.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">4. Service interruption</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If the service is unavailable for an extended period through our
              fault, write to us: we refund the period concerned on a pro-rata
              basis, even beyond the 14-day window.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">
              5. How to request a refund
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Write to{' '}
              <a
                href="mailto:support@nexoracoding.com"
                className="underline hover:text-foreground"
              >
                support@nexoracoding.com
              </a>{' '}
              from your account email address, quoting the transaction
              reference. We reply within 24 business hours and process the
              request without discussion if it falls within the 14-day window.
            </p>
          </section>

          <p className="text-sm text-muted-foreground leading-relaxed">
            This policy supplements our{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              terms of use
            </Link>
            .
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
