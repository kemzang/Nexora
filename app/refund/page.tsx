import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'Politique de remboursement — Nexora',
  description:
    "Conditions de remboursement et d'annulation des abonnements Nexora.",
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
            Politique de remboursement
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Dernière mise à jour : 28 septembre 2026
          </p>
        </div>

        <article className="max-w-2xl">
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Nexora est un service par abonnement mensuel. Un palier gratuit
            permet d&apos;essayer le service sans payer, et les conditions
            ci-dessous s&apos;appliquent aux abonnements payants.
          </p>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">1. Délai de rétractation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous disposez de <strong>14 jours</strong> à compter de votre
              premier paiement pour demander le remboursement intégral de votre
              abonnement, sans avoir à vous justifier. Le remboursement est
              effectué sur le moyen de paiement utilisé lors de l&apos;achat,
              sous 5 à 10 jours ouvrés selon votre banque.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">2. Renouvellements</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Passé ce délai, les échéances mensuelles déjà réglées ne sont pas
              remboursées, le service ayant été rendu sur la période concernée.
              Vous pouvez annuler à tout moment pour interrompre les
              renouvellements suivants.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">3. Annulation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L&apos;annulation s&apos;effectue en un clic depuis votre{' '}
              <Link href="/dashboard" className="underline hover:text-foreground">
                tableau de bord
              </Link>
              , section Abonnement. Aucune démarche par courriel n&apos;est
              nécessaire. Votre accès reste actif jusqu&apos;à la fin de la
              période déjà payée, puis bascule automatiquement sur le palier
              gratuit — votre compte et vos données sont conservés.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">
              4. Interruption de service
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si le service est indisponible de manière prolongée de notre fait,
              écrivez-nous : nous remboursons la période concernée au prorata,
              même au-delà du délai de 14 jours.
            </p>
          </section>

          <section className="mb-9">
            <h2 className="text-lg font-bold mb-3">
              5. Comment demander un remboursement
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Écrivez à{' '}
              <a
                href="mailto:support@nexoracoding.com"
                className="underline hover:text-foreground"
              >
                support@nexoracoding.com
              </a>{' '}
              depuis l&apos;adresse de votre compte, en indiquant la référence
              de la transaction. Nous répondons sous 24 heures ouvrées et
              traitons la demande sans discussion si elle entre dans le délai de
              14 jours.
            </p>
          </section>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette politique complète nos{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              conditions d&apos;utilisation
            </Link>
            .
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
