'use client'

import { useEffect, useState } from 'react'
import AccountMenu from './AccountMenu'

/** What /api/forum/me returns for a signed-in member. */
interface HeaderMember {
  display_name: string
  verified: boolean
  role: string
}

/**
 * The account control in the header.
 *
 * A CLIENT island that asks /api/forum/me who is signed in. It used to be a
 * Server Component reading the session cookie, and a cookie read in the root
 * layout made every page on the site dynamic — no ISR, no edge cache (SEO audit
 * O1). Asking from the browser keeps the pages static.
 *
 * Until the answer arrives it renders an empty slot the size of the control,
 * not the guest menu, so a signed-in member never sees "Sign in" flash and the
 * header does not shift. Any failure resolves to the guest menu, as the server
 * version did. Nothing here is indexed content.
 *
 * Renders nothing when the community forum is off for this site: accounts exist
 * for the forum, and a control leading nowhere is worse than no control.
 */
export default function HeaderAccount({ enabled }: { enabled: boolean }) {
  // undefined = still asking; null = guest.
  const [member, setMember] = useState<HeaderMember | null | undefined>(undefined)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    fetch('/api/forum/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ data: HeaderMember | null }>) : { data: null }))
      .then((json) => {
        if (!cancelled) setMember(json.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setMember(null)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  if (!enabled) return null

  if (member === undefined) {
    // Same footprint as the guest trigger: 74px (padding + 32px disc + gap +
    // chevron), 44px below 375px where the chevron is hidden.
    return <div aria-hidden className="min-h-11 w-[4.625rem] max-[374px]:w-11" />
  }

  if (member === null) {
    return (
      <AccountMenu
        label="Account"
        entries={[
          { href: '/login', label: 'Sign in', primary: true },
          { href: '/register', label: 'Create an account' },
        ]}
      />
    )
  }

  return (
    <AccountMenu
      label={member.display_name}
      initial={member.display_name.slice(0, 1).toUpperCase()}
      // An unconfirmed account cannot post, so the menu says so rather than
      // letting them find out at the reply form.
      badge={
        !member.verified
          ? 'Confirm your email to post'
          : member.role !== 'user'
            ? member.role
            : null
      }
      entries={[
        { href: '/forum/account', label: 'My account', primary: true },
        { href: '/forum', label: 'Community forum' },
      ]}
      signOut
    />
  )
}
