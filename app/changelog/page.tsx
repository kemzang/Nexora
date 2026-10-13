import type { Metadata } from 'next'
import ChangelogPageClient from './changelog-client'

export const metadata: Metadata = {
  title: 'Changelog — Nexora',
  description: 'The latest improvements shipped to Nexora.',
}

export default function ChangelogPage() {
  return <ChangelogPageClient />
}
