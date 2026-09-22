import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEditorial, getReviewFeed } from '@/lib/api'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import Pagination from '@/components/Pagination'
import type { ReviewThread } from '@shared/types/casinoReview'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const PAGE_URL = `${SITE_URL}/reviews`

// Used ONLY when the metadata fetch itself fails. Every other path reads the
// wording an editor set in the admin panel, which is already defaulted
// server-side — see SiteForum::resolved().
const FALLBACK_META_TITLE = 'Player Forum'
const FALLBACK_META_DESCRIPTION = 'Player-written reviews of the casinos listed here, grouped by operator.'

type Props = { searchParams: Promise<{ page?: string }> }

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : 1
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * A rating as five stars.
 *
 * `aria-label` carries the number and the stars are hidden from the
 * accessibility tree, so a screen reader hears "4 out of 5" once instead of the
 * word "star" five times.
 */
function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber-400' : 'text-slate-200'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

/** The operator's logo, or its initial when it has no image on file. */
function CasinoMark({ thread }: { thread: ReviewThread }) {
  const image = resolveImageUrl(thread.casino.image_path ?? thread.casino.banner_image)

  if (!image) {
    return (
      <span
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 font-display text-xl font-bold text-emerald-700"
        aria-hidden
      >
        {thread.casino.name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={image}
      alt={thread.casino.name}
      width={160}
      height={112}
      sizes="80px"
      className="h-14 w-20 shrink-0 rounded-2xl bg-white ring-1 ring-slate-100"
      style={{ objectFit: 'contain' }}
    />
  )
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePage((await searchParams).page)

  // The same call the page body makes. Next dedupes identical fetches within one
  // request, so reading the admin's wording here costs no extra round trip.
  const res = await getReviewFeed(page).catch(() => null)
  const settings = res?.data.settings

  // Page 2+ gets its OWN canonical rather than pointing at page 1: they hold
  // different casinos, so collapsing them would ask Google to drop real content.
  const path = page > 1 ? `/reviews?page=${page}` : '/reviews'
  const metaTitle = settings?.meta_title ?? FALLBACK_META_TITLE
  const description = settings?.meta_description ?? FALLBACK_META_DESCRIPTION
  const title = page > 1 ? `${metaTitle} — Page ${page}` : metaTitle

  return {
    title,
    description,
    alternates: { canonical: path },
    // Editor-controlled: "hide from search engines" keeps the page for visitors
    // while withholding it from indexing. `follow` stays on so the links out to
    // the casino pages still carry weight.
    ...(settings?.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url: path,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/**
 * The forum: every published player review on this site, grouped by casino.
 *
 * A SERVER component, deliberately. Review text is user-written content that a
 * crawler should see in the delivered HTML — fetching it in the browser would
 * hide the only thing this page is made of. Nothing here is interactive, so
 * there is no client component on the route at all.
 *
 * 404s when the site has reviews switched off. That is the same admin toggle
 * (`reviews_enabled`) the per-casino review section obeys, so a site cannot end
 * up with a forum but no way to post to it.
 */
export default async function ForumPage({ searchParams }: Props) {
  const page = parsePage((await searchParams).page)

  // Null means the feature is off for this site — not an error, a 404.
  const res = await getReviewFeed(page)
  if (res === null) notFound()

  // Attribution for the editorial note. Reuses the site's ONE editorial
  // identity rather than a second author field on the forum — two places to
  // set it is how they drift apart. Fails soft to the site name.
  const editorial = await getEditorial().catch(() => ({ author: null, methodology_page_slug: null }))

  // Heading, intro, empty state and page sizes all come from the admin panel.
  // Blanks were already replaced by defaults server-side, so nothing here has
  // to second-guess an empty string.
  const { threads, summary, meta, settings } = res.data

  // A page number past the end is a dead URL, not an empty list. Page 1 is
  // exempt: an empty forum is a real state with its own copy below.
  if (page > 1 && threads.length === 0) notFound()

  const crumbs = [
    { name: 'Home', url: SITE_URL },
    { name: settings.title, url: PAGE_URL },
  ]

  const graph = [
    buildWebPageSchema({
      name: settings.meta_title,
      url: PAGE_URL,
      description: settings.meta_description,
      breadcrumbId: breadcrumbIdFor(PAGE_URL),
    }),
    buildBreadcrumbSchema(crumbs, PAGE_URL),
    // The threads on THIS page, addressed by the casino pages they lead to.
    // No Review or AggregateRating markup: those reviews belong to the casino
    // pages that host them, and repeating them here would be the same ratings
    // claimed twice.
    buildItemListSchema(
      settings.title,
      PAGE_URL,
      threads.map((t, i) => ({
        position: (page - 1) * meta.per_page + i + 1,
        name: t.casino.name,
        url: `${SITE_URL}/casinos/${t.casino.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pt-14 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[90rem]">
            {/* An ordered LIST, not a row of spans. A breadcrumb is a sequence,
                and `ol` is what tells a screen reader how many steps there are
                and which one you are on. The chevron is decorative and hidden
                from that tree, so the trail reads "Home, Player Forum". */}
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center gap-2.5 text-sm text-slate-400">
                <li>
                  <Link
                    href="/"
                    className="inline-flex min-h-11 min-w-11 items-center rounded font-medium text-slate-500 underline-offset-4 transition-colors hover:text-emerald-700 hover:underline"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden className="text-slate-300">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </li>
                <li aria-current="page" className="font-medium text-slate-600">
                  {settings.title}
                </li>
              </ol>
            </nav>

            {/* An editor who clears the eyebrow means "show none" — it is the
                one field with no fallback, so an empty value renders nothing
                rather than the shipped label. */}
            {settings.eyebrow !== '' && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 backdrop-blur">
                {settings.eyebrow}
              </p>
            )}

            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              {settings.title}
            </h1>

            <p className="mt-5 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-slate-500">
              {settings.intro}
            </p>

            {/* Site-wide totals — computed across every published review, not
                just this page, so they do not change as you paginate. */}
            {settings.show_stats && summary.total > 0 && (
              <dl className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-3 backdrop-blur">
                  <dt className="sr-only">Reviews published</dt>
                  <dd className="font-display text-lg font-semibold text-slate-900">
                    {COPY.forum.statReviews(summary.total)}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-3 backdrop-blur">
                  <dt className="sr-only">Casinos covered</dt>
                  <dd className="font-display text-lg font-semibold text-slate-900">
                    {COPY.forum.statCasinos(summary.casinos)}
                  </dd>
                </div>
                {/* Null, not falsy: an average of 0 is impossible here (ratings
                    start at 1), but "no reviews" and "rated 0" must never
                    collapse into the same branch. */}
                {summary.average !== null && (
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3">
                    <dt className="sr-only">Average rating</dt>
                    <dd className="flex items-center gap-2 font-display text-lg font-semibold text-emerald-800">
                      <Stars rating={Math.round(summary.average)} />
                      {COPY.forum.statAverage(summary.average)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </section>

        {/* Threads */}
        {/* The site's own note. Visually and semantically distinct from the
            visitor reviews below it: a different surface, an explicit byline,
            and NO Review markup — it is the site speaking, and must never read
            as though a player wrote it. Rendered whether or not there are
            reviews, so an empty forum still says something true. */}
        {settings.editorial_enabled && (
          <section className="px-5 pb-10 sm:px-6 lg:px-8" aria-labelledby="editorial-heading">
            <div className="mx-auto max-w-[90rem]">
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur sm:p-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
                  {editorial.author ? 'From the editor' : `From ${SITE_NAME}`}
                </p>
                <h2 id="editorial-heading" className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">
                  {settings.editorial_title}
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
                  {settings.editorial_body}
                </p>

                {editorial.author && (
                  <p className="mt-5 border-t border-slate-200/70 pt-4 text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">{editorial.author.name}</span>
                    {editorial.author.role && <span> · {editorial.author.role}</span>}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 pb-24 sm:px-6 lg:px-8" aria-labelledby="threads-heading">
          <div className="mx-auto max-w-[90rem]">
            <h2 id="threads-heading" className="sr-only">
              Reviews by casino
            </h2>

            {threads.length === 0 ? (
              /* Vertical padding is deliberately larger than horizontal: this
                 panel is the only thing on the page, and a square inset makes a
                 wide container look empty rather than composed.
                 A braced JSX comment is invalid in this slot — it is an
                 expression position, not children — hence a plain JS comment. */
              <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-6 py-16 text-center backdrop-blur sm:px-10 sm:py-20">
                <span
                  className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-3xl ring-8 ring-emerald-50/70"
                  aria-hidden
                >
                  💬
                </span>
                <h3 className="mt-7 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {settings.empty_title}
                </h3>
                {/* max-w-md, not max-w-xl: ~65 characters a line is the readable
                    measure, and this container is far wider than that. */}
                <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-[15px] leading-relaxed text-slate-500">
                  {settings.empty_body}
                </p>
                <Link
                  href={settings.empty_cta_url}
                  className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-4 font-semibold leading-none text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40"
                >
                  {settings.empty_cta_label}
                </Link>
              </div>
            ) : (
              <ol className="flex flex-col gap-8">
                {threads.map((thread) => (
                  <li
                    key={thread.casino.id}
                    // Anchor target for a search result. The forum is a single
                    // route with no per-review URL, so a "Forum" suggestion
                    // links to /reviews#casino-<slug> and lands on the thread
                    // rather than at the top of the page. scroll-mt clears the
                    // sticky header, which would otherwise cover the heading.
                    id={`casino-${thread.casino.slug}`}
                    className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-[0_2px_18px_-10px_rgba(15,23,42,0.2)] backdrop-blur transition-shadow hover:shadow-[0_20px_44px_-18px_rgba(5,150,105,0.35)]"
                  >
                    {/* Thread head — who is being reviewed */}
                    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200/70 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 px-5 py-5 sm:px-7">
                      <CasinoMark thread={thread} />

                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-xl font-semibold text-slate-900">
                          <Link
                            href={`/casinos/${thread.casino.slug}`}
                            className="inline-block py-2.5 -my-2.5 transition-colors hover:text-emerald-700"
                          >
                            {thread.casino.name}
                          </Link>
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          {thread.summary.average !== null && (
                            <span className="inline-flex items-center gap-1.5">
                              <Stars rating={Math.round(thread.summary.average)} />
                              <span className="font-semibold text-slate-700">
                                {COPY.forum.threadRating(thread.summary.average, thread.summary.total)}
                              </span>
                            </span>
                          )}
                          {thread.summary.last_activity && (
                            <span className="text-slate-400">
                              {COPY.forum.lastActivity}{' '}
                              <time dateTime={thread.summary.last_activity}>
                                {formatDate(thread.summary.last_activity)}
                              </time>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Posts. The left rule is the thread line that ties the
                        replies to the operator above them. */}
                    {/* Two columns from xl: on the 90rem measure a single
                        column would put one review on a 180-character line. */}
                    <ul className="grid grid-cols-1 gap-6 px-5 py-7 sm:px-7 xl:grid-cols-2 xl:gap-x-10">
                      {thread.reviews.map((review) => (
                        <li
                          key={review.id}
                          className="relative border-l-2 border-emerald-100 pl-5 transition-colors hover:border-emerald-400"
                        >
                          <span
                            className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 ring-4 ring-white"
                            aria-hidden
                          />

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-slate-800">{review.author_name}</span>
                            <Stars rating={review.rating} className="text-sm" />
                            {review.published_at && (
                              <time dateTime={review.published_at} className="text-xs text-slate-400">
                                {formatDate(review.published_at)}
                              </time>
                            )}
                          </div>

                          {review.title && (
                            <p className="mt-1.5 font-display font-semibold text-slate-900">
                              {review.title}
                            </p>
                          )}

                          {/* whitespace-pre-line keeps the writer's paragraph
                              breaks. React escapes the text, so it is never
                              treated as markup. */}
                          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {review.body}
                          </p>
                        </li>
                      ))}
                    </ul>

                    {/* Thread foot — both routes lead to the same section on the
                        casino page: the full list, and the form under it. */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/70 px-5 py-5 sm:px-7">
                      {thread.has_more && (
                        <Link
                          href={`/casinos/${thread.casino.slug}#player-reviews`}
                          className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                        >
                          {COPY.forum.readAll(thread.summary.total)} →
                        </Link>
                      )}
                      <Link
                        href={`/casinos/${thread.casino.slug}#player-reviews`}
                        className="inline-flex min-h-11 items-center px-1 py-2.5 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
                      >
                        {COPY.forum.writeOne}
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <Pagination basePath="/reviews" current={meta.current_page} last={meta.last_page} />
          </div>
        </section>
      </main>
    </>
  )
}
