'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/constants/copy'

/**
 * The reply form.
 *
 * A CLIENT component and the ONLY one on the article page — every post is
 * server-rendered above it, so the thread is in the HTML for crawlers and this
 * island is just the write path.
 *
 * ── Three anti-abuse measures live here ─────────────────────────────────────
 *
 * 1. The honeypot. `website` is `present` and `max:0` server-side, so it must
 *    arrive AND be empty. It is hidden with inline styles rather than a utility
 *    class, because a Tailwind class that silently fails to generate turns the
 *    honeypot into a visible input that rejects real people as bots — which has
 *    already happened once on this project's subscribe form.
 * 2. `tabIndex={-1}` and `autoComplete="off"` keep a keyboard user and a
 *    password manager out of it.
 * 3. `aria-hidden` keeps a screen reader from announcing it at all.
 *
 * The server is still the authority on rate limits, pre-moderation and link
 * restrictions; nothing here is a security control on its own.
 */
export default function ReplyForm({
  articleSlug,
  parentId = null,
  onDone,
  compact = false,
}: {
  articleSlug: string
  /** Set for a comment. The server refuses a reply to a reply. */
  parentId?: number | null
  onDone?: () => void
  compact?: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const form = new FormData(e.currentTarget)

    if (String(form.get('website') ?? '') !== '') {
      // Fail silently rather than explaining. Telling a bot which field it
      // tripped is the one thing a honeypot must never do.
      setNotice('Thanks.')
      return
    }

    setBusy(true)

    try {
      const res = await fetch(`/api/forum/${encodeURIComponent(articleSlug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No Authorization header, and that is the point: the member's token is
        // in an httpOnly cookie that this code cannot read. `same-origin` sends
        // it to our own route handler, which attaches it upstream.
        credentials: 'same-origin',
        body: JSON.stringify({ body, parent_id: parentId, website: '' }),
      })

      const payload = (await res.json().catch(() => ({}))) as {
        data?: { pending?: boolean; message?: string | null }
        message?: string
      }

      if (!res.ok) {
        setError(payload.message ?? 'That reply could not be posted.')
        return
      }

      setBody('')

      if (payload.data?.pending) {
        // Told the truth rather than shown as live. A held post that looks
        // published is why people repost the same thing three times.
        setNotice(payload.data.message ?? COPY.communityForum.premoderationNotice)
      } else {
        router.refresh()
        onDone?.()
      }
    } catch {
      setError('That reply could not be posted. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={compact ? '' : 'rounded-2xl border border-slate-200 bg-white p-5'}>
      {!compact && (
        <h2 className="font-display text-lg font-semibold text-slate-900">{COPY.communityForum.replyHeading}</h2>
      )}

      <label htmlFor={`reply-${parentId ?? 'root'}`} className="sr-only">
        {COPY.communityForum.replyHeading}
      </label>
      <textarea
        id={`reply-${parentId ?? 'root'}`}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={2}
        maxLength={8000}
        rows={compact ? 3 : 5}
        placeholder={COPY.communityForum.replyPlaceholder}
        aria-describedby={error ? `reply-error-${parentId ?? 'root'}` : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />

      {/* Honeypot — inline styles, never a utility class. See the docblock. */}
      <div aria-hidden style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
        <label htmlFor={`website-${parentId ?? 'root'}`}>Website</label>
        <input id={`website-${parentId ?? 'root'}`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {error && (
        <p id={`reply-error-${parentId ?? 'root'}`} role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || body.trim().length < 2}
          className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Posting…' : COPY.communityForum.replyButton}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
