import type { Metadata } from 'next'
import PricingPageClient from './pricing-client'

export const metadata: Metadata = {
  title: 'Pricing — Nexora',
  description: 'Nexora plans: Free, Starter, Pro, Business and Enterprise. Compare the credits, AI models and features each plan includes.',
}

export default function PricingPage() {
  return <PricingPageClient />
}
