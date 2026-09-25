'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MyForumPost } from '@/lib/forumSession'

/**
 * The member's own posts, with inline editing.
 *
 * `editable` comes from the SERVER, which sets it only while a post is still
 * pending. It is not recomputed here: a published post is part of a
 * conversation other people have read, so it stops being the author's to
 * rewrite, and that rule belongs where it is enforced. This component hides
 * the control; the API refuses the edit regardless.
 */
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-red-50 text-red-700',
  spam: 'bg-slate-100 text-slate-600',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting review',
  approved: 'Published',
  rejected: 'Not published',
  spam: 'Not published',
}

export default function MyPosts({ posts }: { posts: MyForumPost[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (posts.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">You have not posted anything yet.</p>
  }

  function startEdit(post: MyForumPost) {
    setEditingId(post.id)
    setDraft(post.body)
    setError(null)
  }

  async function save(id: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft, website: '' }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }

      if (!res.ok) {
        setError(data.message ?? 'That could not be saved.')
        return
      }

      setEditingId(null)
      router.refresh()
    } catch {
      setError('That could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ul className="mt-4 divide-y divide-slate-200/70" role="list">
      {posts.map((post) => (
        <li key={post.id} className="py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                STATUS_STYLE[post.status] ?? STATUS_STYLE.spam
              }`}
            >
              {STATUS_LABEL[post.status] ?? post.status}
            </span>
            {post.article && (
              <p className="min-w-0 text-sm text-slate-500">
                in{' '}
                {post.status === 'approved' && post.article.category ? (
                  <Link
                    href={`/forum/${post.article.category}/${post.article.slug}#post-${post.id}`}
                    className="font-semibold text-slate-700 underline underline-offset-4 hover:text-emerald-700"
                  >
                    {post.article.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-700">{post.article.title}</span>
                )}
                {post.article.board && <span className="text-slate-400"> · {post.article.board}</span>}
              </p>
            )}
          </div>

          {editingId === post.id ? (
            <div className="mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => save(post.id)}
                  disabled={busy || draft.trim().length < 2}
                  className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{post.body}</p>
              {post.editable && (
                <button
                  type="button"
                  onClick={() => startEdit(post)}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                >
                  Edit
                </button>
              )}
              {!post.editable && post.status === 'approved' && (
                <p className="mt-2 text-xs text-slate-400">
                  Published posts cannot be edited.
                </p>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
