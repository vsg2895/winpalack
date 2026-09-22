import type { Metadata } from 'next'
import AuthPage from '@/components/forum/AuthPage'

// Per-visitor: a signed-in member is redirected, so no ISR copy may exist.
export const dynamic = 'force-dynamic'

/**
 * `noindex`: a sign-in form has nothing to rank for, and letting it into the
 * index only competes with the pages that do. /register is the one that is
 * allowed in — it is a landing page for joining.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Winpalack account to reply in the community forum and follow discussions.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/login' },
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode="signin" searchParams={searchParams} />
}
