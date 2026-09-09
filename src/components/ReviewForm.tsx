'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview } from '@/app/actions/reviews'
import { COPY } from '@/constants/copy'
import { useToast } from '@/components/ToastProvider'

/**
 * The "write a review" form.
 *
 * A client component because it is the only interactive part of an otherwise
 * static, server-rendered page — the review list above it stays a server
 * component so the reviews themselves are in the HTML for crawlers.
 *
 * It calls the `submitReview` server action rather than the backend directly,
 * so API_SITE_KEY is never shipped to a browser. The action — not a route
 * handler — because only a server action may call `updateTag`, and only
 * `updateTag` makes the new review present in the very next render.
 */
export default function ReviewForm({ casinoSlug }: { casinoSlug: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  // Field-level errors from the API, keyed as Laravel returns them.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  // Which of the two confirmations to show — set from the API's answer,
  // never assumed, because the site can be switched to pre-moderation.
  const [published, setPublished] = useState(false)

  const toast = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setErrors({})

    try {
      const result = await submitReview({
        casinoSlug,
        author_name: name,
        author_email: email,
        rating,
        title,
        body,
      })

      if (!result.ok) {
        if (result.errors) setErrors(result.errors)
        toast(result.message ?? COPY.reviews.error, 'error')
        return
      }

      // Replaced by a confirmation rather than cleared: an empty form would read
      // as "nothing happened" either way.
      setPublished(result.published)
      setSubmitted(true)
      toast(result.published ? COPY.reviews.success : COPY.reviews.successPending, 'success')

      // Re-render the server components above so the review really is in the
      // list the author is being told to scroll up to. The action has already
      // expired the tags those reads are cached under, so this refetch returns
      // it. Wrapped in a transition so the refresh does not block the
      // confirmation from painting.
      if (result.published) {
        startTransition(() => router.refresh())
      }
    } catch {
      toast(COPY.reviews.error, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-sm text-emerald-800">
        {published ? COPY.reviews.success : COPY.reviews.successPending}
      </div>
    )
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400'
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'
  const errorText = 'mt-1 text-xs text-rose-600'

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-slate-900">{COPY.reviews.formTitle}</h3>
      <p className="mt-1 text-sm text-slate-500">{COPY.reviews.formIntro}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="review-name" className={label}>
            {COPY.reviews.nameLabel}
          </label>
          <input
            id="review-name"
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
          {errors.author_name && <p className={errorText}>{errors.author_name}</p>}
        </div>

        <div>
          <label htmlFor="review-email" className={label}>
            {COPY.reviews.emailLabel}
          </label>
          <input
            id="review-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          {errors.author_email && <p className={errorText}>{errors.author_email}</p>}
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className={label}>{COPY.reviews.ratingLabel}</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rating === n}
              aria-label={`${n} out of 5`}
              onClick={() => setRating(n)}
              className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-colors ${
                rating >= n
                  ? 'border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-emerald-300'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <p className={errorText}>{errors.rating}</p>}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="review-title" className={label}>
          {COPY.reviews.titleLabel}
        </label>
        <input
          id="review-title"
          type="text"
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
        {errors.title && <p className={errorText}>{errors.title}</p>}
      </div>

      <div className="mt-4">
        <label htmlFor="review-body" className={label}>
          {COPY.reviews.bodyLabel}
        </label>
        <textarea
          id="review-body"
          required
          rows={5}
          minLength={20}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={COPY.reviews.bodyPlaceholder}
          className={field}
        />
        {errors.body && <p className={errorText}>{errors.body}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-opacity disabled:opacity-60"
      >
        {loading ? '…' : COPY.reviews.submit}
      </button>
    </form>
  )
}
