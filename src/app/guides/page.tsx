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
        {/* Same 90rem measure as the other listings; the grid steps up to
            three and four columns so the cards stay card-sized. */}
        <div className="mx-auto max-w-[90rem]">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.guides.pageTitle}</h1>
          <p className="mt-3 max-w-2xl text-slate-500">{COPY.guides.pageDescription}</p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 2xl:grid-cols-4" role="list">
            {articles.map((article) => {
              const hero = resolveImageUrl(article.hero_image_path)

              return (
                <li key={article.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <Link href={`/guides/${article.slug}`} className="flex h-full flex-col">
                    {hero && (
                      <div className="relative aspect-[16/9] bg-slate-100">
                        <Image src={hero} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 340px" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 lg:p-8">
                      {/* Guides carry no hero image, so the card opens with an
                          "information" mark instead — it says "explainer, not
                          news" before the title is read. Decorative: the
                          heading carries the meaning, so the SVG is hidden
                          from assistive tech. */}
                      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 lg:h-12 lg:w-12" aria-hidden>
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      </span>
                      <h2 className="font-display text-xl font-bold leading-snug text-slate-900 lg:text-2xl">{article.title}</h2>
                      {article.excerpt && (
                        <p className="mt-3 line-clamp-3 text-sm text-slate-500 lg:text-base">{article.excerpt}</p>
                      )}
                      {article.published_at && (
                        <p className="mt-auto pt-5 text-xs text-slate-400 lg:text-sm">
                          <time dateTime={article.published_at}>
                            {new Date(article.published_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </time>
                        </p>
                      )}
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
