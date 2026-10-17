import type { Metadata } from 'next'
import InviteClient from './invite-client'

export const metadata: Metadata = {
  title: 'Team invitation | Nexora',
  description: 'Accept your invitation to join a team on Nexora',
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <InviteClient token={token} />
}
