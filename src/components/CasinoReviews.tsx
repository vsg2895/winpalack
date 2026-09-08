import { getCasinoReviews } from '@/lib/api'
import { COPY } from '@/constants/copy'
import ReviewForm from '@/components/ReviewForm'

/**
 * Player reviews for one casino: the published list, then the form.
 *
 * A SERVER component so the reviews themselves are in the delivered HTML —
 * user-generated review text is exactly the content a crawler should see, and
 * fetching it client-side would hide it. Only the form below is a client
 * component.
 *
 * Renders NOTHING when the site has reviews switched off: the API returns null,
 * and a heading with no list and no form under it would be worse than absence.
 */
export default async function CasinoReviews({
  casinoSlug,
  casinoName,
}: {
  casinoSlug: string
  casinoName: string
}) {
  // A failed fetch is treated the same as the feature being off. A casino page
  // must still render if the reviews endpoint is briefly unavailable — the
  // review section is an addition to the page, not the page itself.
  const res = await getCasinoReviews(casinoSlug).catch(() => null)

  if (res === null) return null

  const { reviews, summary } = res.data

  return (
    <section className="mt-10" aria-labelledby="player-reviews">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="player-reviews" className="font-display text-2xl font-bold text-slate-900">
          {COPY.reviews.heading}
        </h2>

        {/* `average` is null with no reviews — distinct from a rating of 0, which
            is why this checks for null rather than falsiness. */}
        {summary.average !== null && (
          <p className="text-sm text-slate-500">
            {COPY.reviews.ratingSummary(summary.average, summary.total)}
          </p>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-slate-500">{COPY.reviews.empty}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="text-sm font-semibold text-emerald-700"
                  aria-label={`${review.rating} out of 5`}
                >
                  {'★'.repeat(review.rating)}
                  <span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span>
                </span>
                <span className="text-sm font-semibold text-slate-800">{review.author_name}</span>
                {review.published_at && (
                  <time dateTime={review.published_at} className="text-xs text-slate-400">
                    {new Date(review.published_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                )}
              </div>

              {review.title && (
                <h3 className="mt-2 font-semibold text-slate-900">{review.title}</h3>
              )}

              {/* whitespace-pre-line keeps the reviewer's paragraph breaks. The
                  text is escaped by React, so it is never treated as markup. */}
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <ReviewForm casinoSlug={casinoSlug} />
      </div>

      <p className="sr-only">Reviews of {casinoName} written by visitors to this site.</p>
    </section>
  )
}
