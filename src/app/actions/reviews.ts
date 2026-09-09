'use server'

import { updateTag } from 'next/cache'
import { API_URL } from '@/lib/config'

/**
 * Submit a visitor review.
 *
 * A SERVER ACTION rather than the route handler this used to be, and the reason
 * is `updateTag`. Next 16 draws a hard line between the two invalidation verbs:
 * `revalidateTag` — the only one a Route Handler may call — marks a tag stale
 * and lets the NEXT request keep serving the stale copy while it regenerates,
 * whereas `updateTag` expires it outright so the next render waits for fresh
 * data. Only the second gives read-your-own-writes, which is the entire promise
 * of publishing a review immediately. Through the route handler the author
 * reliably got a "your review is now live" message next to a list that did not
 * contain it.
 *
 * `API_SITE_KEY` is exactly as safe here as it was in the route handler: a
 * server action body never ships to the browser.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export type SubmitReviewInput = {
  casinoSlug: string
  author_name: string
  author_email?: string
  rating: number
  title?: string
  body: string
}

export type SubmitReviewResult = {
  ok: boolean
  /** True only when the API actually published it — never assumed client-side. */
  published: boolean
  message?: string
  /** Laravel's 422 shape, flattened to one message per field. */
  errors?: Record<string, string>
}

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  if (!KEY || !SITE || !API) {
    return { ok: false, published: false, message: 'Reviews are unavailable right now.' }
  }

  // A slug becomes a path segment upstream, so a malformed one must never be
  // interpolated into the URL.
  if (!/^[a-z0-9-]+$/i.test(input.casinoSlug)) {
    return { ok: false, published: false, message: 'Unknown casino.' }
  }

  // Only the fields the API accepts. `status` is deliberately not among them —
  // a submitter must not be able to publish their own review. The backend
  // ignores it too; there is simply no reason to relay it.
  const payload = {
    author_name: input.author_name,
    author_email: input.author_email || null,
    rating: input.rating,
    title: input.title || null,
    body: input.body,
  }

  let res: Response
  try {
    res = await fetch(`${API}/sites/${SITE}/casinos/${input.casinoSlug}/reviews`, {
      method: 'POST',
      headers: {
        'X-Site-Key': KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, published: false, message: 'That did not send. Please try again.' }
  }

  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    published?: boolean
    errors?: Record<string, string[]>
  }

  if (!res.ok) {
    return {
      ok: false,
      published: false,
      message: data.message,
      errors: data.errors
        ? Object.fromEntries(
            Object.entries(data.errors).map(([field, messages]) => [field, messages[0] ?? '']),
          )
        : undefined,
    }
  }

  const published = data.published === true

  // Expire the cached reads that carry reviews so the re-render the client asks
  // for next includes this one. Laravel does ping /api/revalidate for the same
  // tags, but that ping is queued and authenticated by REVALIDATE_SECRET — it
  // arrives late, or never, if a worker is down or the secret has drifted
  // between environments. This path already knows the write succeeded, so it
  // does not wait to be told.
  if (published) {
    updateTag(`site:${SITE}`)
    updateTag('reviews')
    updateTag('casinos')
  }

  return { ok: true, published, message: data.message }
}
