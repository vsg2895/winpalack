import type { Metadata } from 'next'
import AuthPage from '@/components/forum/AuthPage'

// Per-visitor: a signed-in member is redirected, so no ISR copy may exist.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a free Winpalack account to join the community forum: ask about a withdrawal, compare terms and share what actually happened when you cashed out.',
  alternates: { canonical: '/register' },
  openGraph: { type: 'website', url: '/register', title: 'Create an account', description: 'Join the Winpalack community forum.' },
}

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode="register" searchParams={searchParams} />
}
