'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * "Continue with Google" — Google Identity Services, rendered by Google itself.
 *
 * ── Why Google draws the button ─────────────────────────────────────────────
 *
 * GIS hands back a signed ID token only to a button it rendered; a hand-built
 * button would mean driving the flow some other way (a popup we open, a redirect
 * we handle) and owning state, nonce and error handling that this does not need.
 * Google's button is also the one treatment their brand terms allow without
 * conditions. The cost is that it is an iframe we cannot restyle, so the card
 * around it carries our own spacing and the divider beneath it ties the two
 * halves of the form together.
 *
 * ── What crosses the wire ───────────────────────────────────────────────────
 *
 * The CLIENT ID is public by design — it identifies the application to Google
 * and is meant to sit in a browser. The ID token goes to /api/forum/auth/google,
 * which is a server route: it adds the site key and receives the session token,
 * which lands in an httpOnly cookie and never reaches script. There is no client
 * secret anywhere in this flow.
 *
 * Renders NOTHING when no client id is configured, so a site that has not set
 * one up shows a password form with no broken button beside it.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
            ux_mode?: 'popup' | 'redirect'
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'small' | 'medium' | 'large'
              shape?: 'rectangular' | 'pill'
              text?: 'signin_with' | 'signup_with' | 'continue_with'
              width?: number
              logo_alignment?: 'left' | 'center'
            },
          ) => void
        }
      }
    }
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const GSI_SRC = 'https://accounts.google.com/gsi/client'

export default function GoogleSignInButton({ next }: { next?: string }) {
  const router = useRouter()
  const holder = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = useCallback(
    async (credential: string) => {
      setError(null)
      setBusy(true)
      try {
        const res = await fetch('/api/forum/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential }),
        })

        const json = (await res.json().catch(() => ({}))) as { message?: string }

        if (!res.ok) {
          setError(json.message ?? 'Could not sign in with Google.')
          return
        }

        // A full refresh, not a client-side state flip: every page decides
        // between signed-in and signed-out on the SERVER, from the cookie.
        router.replace(next || '/forum')
        router.refresh()
      } catch {
        setError('Could not reach the server. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [next, router],
  )

  useEffect(() => {
    if (!CLIENT_ID || !holder.current) return

    let cancelled = false

    const render = () => {
      if (cancelled || !holder.current || !window.google) return

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: ({ credential }) => {
          if (credential) void signIn(credential)
        },
        ux_mode: 'popup',
        // No One Tap and no silent re-selection: this button is on a page the
        // visitor chose to open, and a prompt that signs somebody in without
        // them asking is not a thing to do on a gambling site.
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      // Google's button is an iframe of a FIXED pixel width — it cannot be told
      // "100%". The card it sits in is 448px at most and has 24px of padding,
      // so it is drawn to the holder's real width and redrawn when that changes.
      const width = Math.round(Math.min(holder.current.offsetWidth || 320, 400))

      holder.current.innerHTML = ''
      window.google.accounts.id.renderButton(holder.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width,
      })
    }

    if (window.google) {
      render()
    } else {
      // One script tag for the page, however many buttons mount.
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
      if (existing) {
        existing.addEventListener('load', render, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = GSI_SRC
        script.async = true
        script.defer = true
        script.addEventListener('load', render, { once: true })
        document.head.appendChild(script)
      }
    }

    // Redraw on resize: the iframe keeps whatever pixel width it was given, so
    // a phone rotated to landscape would otherwise leave a narrow button in a
    // wide card.
    const onResize = () => render()
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [signIn])

  if (!CLIENT_ID) return null

  return (
    <div className="mt-6">
      {/* The divider says these are two ways into the SAME account, not two
          different things to fill in. The label sits on the card's own white so
          the rule appears to pass behind it rather than stopping either side. */}
      <div className="relative flex items-center" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
        <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">or</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
      </div>

      {/*
        Google draws the button itself, inside an iframe we cannot style — so
        everything here happens AROUND it. The wrapper carries the pill shape,
        the shadow and the hover lift, clipped to the same radius so the two
        read as one control rather than a frame with a button inside it.

        `group` + `active:scale` give the press a response the iframe cannot:
        a tap on an iframe shows nothing at all, which makes a slow sign-in feel
        broken. Both are disabled under prefers-reduced-motion.
      */}
      <div className="mt-5 flex justify-center">
        <div
          ref={holder}
          className={`overflow-hidden rounded-full shadow-[0_2px_10px_-4px_rgba(15,23,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.4)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
