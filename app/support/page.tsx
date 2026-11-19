import type { Metadata } from 'next'
import { Mail } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { SiteFooter } from '@/components/patterns/site-footer'
import { SiteHeader } from '@/components/patterns/site-header'
import { SUPPORT_SLA } from '@/lib/supportTickets'
import { SupportClient } from './support-client'

export const metadata: Metadata = {
  title: 'Support — Nexora',
  description:
    'Open a support request: billing, a bug, a model issue, or anything else.',
}

export default function SupportPage() {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <SiteHeader />

      <section className="relative overflow-hidden pb-16 pt-40">
        <div className="orb orb-float-2 bg-foreground/[0.03] top-[-10%] right-[-10%] h-[600px] w-[600px]" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="primary" className="mb-5">
            Support
          </Badge>
          {/* Un seul titre principal par page : le reste de la hierarchie
              descend d'un cran. Voir app/seo-structure.test.ts. */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            How can we help?
          </h1>
          <p className="text-muted-foreground text-lg">
            Pick the type that fits your request. We reply {SUPPORT_SLA}.
          </p>
        </div>
      </section>

      <section className="pb-24">
        {/* Plus large que le reste du site : trois colonnes a l'etroit
            redeviennent illisibles, ce qu'on cherche justement a corriger.
            Le formulaire, lui, se recadre tout seul. */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SupportClient />

          <p className="text-muted-foreground mt-10 flex items-center justify-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5" />
            {/* Le courriel reste propose : certains preferent ecrire depuis
                leur boite, et une seule voie d'acces est une voie de panne. */}
            Prefer email?{' '}
            <a
              href="mailto:support@nexoracoding.com"
              className="text-foreground underline underline-offset-4"
            >
              support@nexoracoding.com
            </a>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
