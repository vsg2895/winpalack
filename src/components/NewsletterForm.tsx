'use client'

import { useState } from 'react'
import { COPY } from '@/constants/copy'
import { useToast } from '@/components/ToastProvider'
import { isValidEmail } from '@/lib/email'
import { trackEvent } from '@/lib/ga'

/**
 * `band` is the dark strip under the header: an icon, the title and subtitle on
 * one line (stacked below `lg`), and the form as a single pill at the right
 * edge with the button inside it. It is drawn for a DARK background. `card`
 * (the default) is the stacked light block the form was designed as. The
 * behaviour is identical in both.
 */
export default function NewsletterForm({ variant = 'card' }: { variant?: 'card' | 'band' }) {
  const band = variant === 'band'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [website, setWebsite] = useState('')
  // A domain-typo correction from SendGrid, e.g. user@gmial.com -> gmail.com.
  // The ONLY validation detail ever shown to a visitor: it is about their own
  // address, and it turns a dead form into a corrected signup.
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null)
  const toast = useToast()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!isValidEmail(email)) {
      toast('Please enter a valid email address.', 'error')
      return
    }
    setLoading(true)
    setSuggestedEmail(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      if (!res.ok) {
        // Surface backend validation (e.g. 422 "You are already subscribed.").
        const data = (await res.json().catch(() => ({}))) as {
          message?: string
          errors?: { email?: string[] }
          suggested_email?: string | null
        }

        setSuggestedEmail(data.suggested_email ?? null)
        toast(data.errors?.email?.[0] ?? data.message ?? COPY.newsletter.error, 'error')
        return
      }
      // The API reports whether a verification email is actually going out
      // (`email_sent` mirrors the site's newsletter_emails_enabled switch).
      // Telling someone to watch their inbox — and dig through spam — for mail
      // this site is not sending would be a worse failure than not collecting
      // the address at all.
      const { email_sent: emailSent } = (await res.json().catch(() => ({}))) as { email_sent?: boolean }

      trackEvent('sign_up', { method: 'newsletter', form_location: 'footer' })
      // Keep the form in place; confirm via a top-corner toast.
      toast(emailSent === false ? COPY.newsletter.successNoEmail : COPY.newsletter.success, 'success')
      setEmail('')
    } catch {
      toast(COPY.newsletter.error, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={
        band
          ? 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8'
          : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6'
      }
    >
      <div className={band ? 'flex min-w-0 items-center gap-3 lg:gap-4' : undefined}>
        {band && (
          /* Envelope + check in the shield's gradient, so the strip reads as
             part of the brand rather than a pasted-in widget. */
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 sm:h-11 sm:w-11 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 lg:h-12 lg:w-12"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
              <path d="M3.8 7.2l7.1 5.1a1.9 1.9 0 0 0 2.2 0l7.1-5.1" />
            </svg>
          </span>
        )}
        {band ? (
          /* Title and subtitle on ONE baseline from `lg`, stacked below it:
             at tablet widths the pair would push the form off the row. */
          <div className="min-w-0 lg:flex lg:items-baseline lg:gap-3">
            <p className="whitespace-nowrap font-display text-base font-semibold sm:text-lg tracking-tight text-white lg:text-xl">{COPY.newsletter.title}</p>
            <p className="mt-0.5 text-sm text-slate-300/90 lg:mt-0 lg:truncate lg:text-base">{COPY.newsletter.subtitle}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-slate-900">{COPY.newsletter.title}</p>
            <p className="mt-0.5 text-sm text-slate-500">{COPY.newsletter.subtitle}</p>
          </div>
        )}
      </div>

      <div className={band ? 'w-full shrink-0 md:w-auto' : 'w-full sm:w-auto'}>
        <form
          onSubmit={onSubmit}
          className={
            band
              /* One pill: the field is transparent inside it and the button
                 sits at its right end, so input and action read as one
                 control. The ring brightens while the field has focus. */
              ? 'relative flex items-center gap-2 rounded-full bg-white/[0.06] p-1.5 ring-1 ring-white/15 transition-shadow focus-within:ring-emerald-400/70 md:w-[24rem] lg:w-[26rem] xl:w-[30rem]'
              : 'relative flex gap-2'
          }
        >

          {/* HONEYPOT. Never shown, never focusable, never autofilled — a human
              cannot reach it, a naive bot fills every field it finds. The server
              rejects any request that carries a value, before the site is
              touched and long before a paid validation credit could be spent.
              Positioned off-screen rather than display:none, which some bots
              skip. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            // Hidden by an INLINE STYLE, deliberately not by a Tailwind class.
            // The class was a real bug: utility CSS can load late, fail, or be
            // purged, and for as long as it is missing this renders as an
            // ordinary focusable text input sitting in the middle of the
            // subscribe form. A person who types into it gets their signup
            // rejected as a bot — an anti-bot measure silently turning away the
            // humans it exists to protect. An inline style travels inside the
            // HTML, so it cannot desync from the markup that carries it.
            //
            // Still off-screen rather than display:none or the hidden
            // attribute: a honeypot only works while a bot believes the field
            // is real, and the obvious ways of hiding it are the ways a bot
            // checks for. pointer-events:none means that even a rendering
            // accident cannot let a human click into it.
            style={{
              position: 'absolute',
              left: '-9999px',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={COPY.newsletter.placeholder}
            aria-label={COPY.newsletter.placeholder}
            // The band's field has NO border: a white pill lifted by a soft
            // shadow, with the emerald ring appearing only on focus.
            className={
              band
                // Transparent inside the pill: the pill's ring is the focus cue.
                ? 'min-h-11 w-full min-w-0 flex-1 rounded-full border-0 bg-transparent px-4 text-base text-white placeholder:text-slate-400 focus:outline-none'
                : 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-72'
            }
          />
          <button
            type="submit"
            disabled={loading}
            className={
              band
                ? 'min-h-11 shrink-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-6 text-sm font-semibold lg:min-h-12 lg:px-7 lg:text-base text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-60'
                : 'min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03] disabled:opacity-60'
            }
          >
            {loading ? COPY.newsletter.checking : COPY.newsletter.button}
          </button>
        </form>

        {/* One click swaps the address in and resubmits. The corrected address
            is a DIFFERENT cache key upstream, so it gets its own validation
            call rather than reusing the typo's verdict. */}
        {suggestedEmail && (
          <p className={`mt-2 text-sm ${band ? 'px-4 text-slate-200' : ''}`}>
            Did you mean{' '}
            <button
              type="button"
              onClick={() => { setEmail(suggestedEmail); setSuggestedEmail(null) }}
              className="font-semibold underline underline-offset-2"
            >
              {suggestedEmail}
            </button>
            ?
          </p>
        )}
      </div>
    </div>
  )
}
