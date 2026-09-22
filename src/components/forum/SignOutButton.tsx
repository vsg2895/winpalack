'use client'

import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    await fetch('/api/forum/auth/logout', { method: 'POST' })
    // refresh(), because who is signed in is decided on the server from the
    // cookie — a client state change alone would leave the page stale.
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700"
    >
      Sign out
    </button>
  )
}
