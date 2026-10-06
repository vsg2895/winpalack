import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getArticles, getSiteFeatures } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * The guides index.
 *
 * 404s below MIN_ARTICLES. A guides section with one post advertises that
 * nobody is writing — worse than not having one — so the whole section stays
 * closed until there is enough to look maintained. The nav link and the sitemap
 * apply the same threshold, so nothing ever points here while it is closed.
 */

/** Mirrors Article::MIN_TO_PUBLISH_SECTION on the server. */
const MIN_ARTICLES = 3

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.guides.pageTitle,
    description: COPY.guides.pageDescription,
    alternates: { canonical: '/guides' },
    openGraph: {
      type: 'website',
      url: '/guides',
      siteName: SITE_NAME,
      title: COPY.guides.pageTitle,
      description: COPY.guides.pageDescription,
    },
  }
}

export default async function GuidesPage() {
  const { guides_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const articles = await getArticles()
  if (articles.length < MIN_ARTICLES) notFound()

  const graph = [
    buildWebPageSchema({
      name: COPY.guides.pageTitle,
      url: `${SITE_URL}/guides`,
      description: COPY.guides.pageDescription,
    }),
    buildItemListSchema(
      COPY.guides.pageTitle,
      `${SITE_URL}/guides`,
      articles.map((a, i) => ({ position: i + 1, name: a.title, url: `${SITE_URL}/guides/${a.slug}` })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure as the other listings. THREE columns at most,
            even on the widest screens: a guide card carries a long title, a
            three-line standfirst and a date, and at four across it was reading
            as a tile rather than as something worth opening. Capping the count
            is what makes each block bigger — the padding and type below step up
            with it. */}
        <div className="mx-auto max-w-[90rem]">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.guides.pageTitle}</h1>
          <p className="mt-3 max-w-2xl text-slate-500">{COPY.guides.pageDescription}</p>

          <ul className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8" role="list">
            {articles.map((article) => {
              const hero = resolveImageUrl(article.hero_image_path)

              return (
                <li
                  key={article.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5"
                >
                  <Link
                    href={`/guides/${article.slug}`}
                    className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    {hero && (
                      <div className="relative aspect-[16/9] bg-slate-100">
                        <Image src={hero} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px" />
                      </div>
                    )}

                    {/* Padding lives on this ONE element and nothing inside it
                        sets its own edge spacing, so the card's inset is a
                        single number rather than something assembled from five
                        margins that can disagree. */}
                    <div className="flex flex-1 flex-col p-8 lg:p-10">
                      {/* Eyebrow: the mark is inline with the word rather than a
                          block above it. A guide has no hero image, so this row
                          is what says "explainer, not news" — it does that in a
                          line of text instead of a 56px square that pushed the
                          title down the card. Decorative: the label carries the
                          meaning, so the SVG is hidden from assistive tech. */}
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                        {COPY.guides.cardEyebrow}
                      </p>

                      <h2 className="mt-5 font-display text-2xl font-bold leading-snug text-balance text-slate-900 transition-colors group-hover:text-emerald-800 lg:text-[1.75rem]">
                        {article.title}
                      </h2>

                      {article.excerpt && (
                        <p className="mt-4 line-clamp-3 text-base leading-relaxed text-slate-500">{article.excerpt}</p>
                      )}

                      {/* Footer, pinned to the bottom so cards in a row line up
                          however short their standfirst is. The rule separates
                          it from the copy; "Read guide" is an affordance, not a
                          second link — the whole card is already one. */}
                      <div className="mt-auto flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5 text-sm">
                        {article.published_at ? (
                          <time dateTime={article.published_at} className="text-slate-400">
                            {new Date(article.published_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </time>
                        ) : (
                          <span />
                        )}
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700" aria-hidden>
                          {COPY.guides.cardCta}
                          <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </>
  )
}
