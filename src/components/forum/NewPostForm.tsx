'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { ForumDiscussionOption } from '@/lib/api'

/**
 * Write a post from the account page.
 *
 * A post belongs to a discussion, so the discussion is chosen here rather than
 * assumed — that is also what puts it in the right board on the forum index.
 * Options are grouped by board, because a flat list of 200 titles is not
 * something anybody can scan.
 *
 * The honeypot follows ReplyForm exactly, inline styles included: a Tailwind
 * class that fails to generate would turn a hidden trap into a visible field
 * that rejects real people, which has happened on this project before.
 */
export default function NewPostForm({ discussions }: { discussions: ForumDiscussionOption[] }) {
  const router = useRouter()
  const [slug, setSlug] = useState(discussions[0]?.slug ?? '')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Board → its discussions, preserving the API's ordering within each group.
  const groups = discussions.reduce<Record<string, ForumDiscussionOption[]>>((acc, d) => {
    const key = d.board?.name ?? 'Other'
    ;(acc[key] ??= []).push(d)
    return acc
  }, {})

  if (discussions.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        There are no open discussions to post in yet.
      </p>
    )
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const form = new FormData(e.currentTarget)

    if (String(form.get('website') ?? '') !== '') {
      setNotice('Thanks.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`/api/forum/${encodeURIComponent(slug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, website: '' }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        message?: string
        data?: { pending?: boolean; message?: string }
      }

      if (!res.ok) {
        setError(data.message ?? 'That could not be posted.')
        return
      }

      setBody('')
      setNotice(
        data.data?.message ??
          'Posted — a moderator will publish it shortly.',
      )
      // Re-renders the server component above, so the new post appears in the
      // list without a full reload.
      router.refresh()
    } catch {
      setError('That could not be posted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="np-discussion" className="block text-sm font-medium text-slate-700">
        Discussion
      </label>
      <select
        id="np-discussion"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="mt-1 min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      >
        {Object.entries(groups).map(([board, items]) => (
          <optgroup key={board} label={board}>
            {items.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <label htmlFor="np-body" className="mt-4 block text-sm font-medium text-slate-700">
        Your post
      </label>
      <textarea
        id="np-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={2}
        rows={5}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        placeholder="Share what you know…"
      />

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}

      <button
        type="submit"
        disabled={busy || body.trim().length < 2}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Posting…' : 'Post'}
      </button>
    </form>
  )
}
