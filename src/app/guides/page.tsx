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

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.guides.pageTitle}</h1>
          <p className="mt-3 max-w-2xl text-slate-500">{COPY.guides.pageDescription}</p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2" role="list">
            {articles.map((article) => {
              const hero = resolveImageUrl(article.hero_image_path)

              return (
                <li key={article.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Link href={`/guides/${article.slug}`} className="block">
                    {hero && (
                      <div className="relative aspect-[16/9] bg-slate-100">
                        <Image src={hero} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 384px" />
                      </div>
                    )}
                    <div className="p-5">
                      <h2 className="font-display text-lg font-bold leading-snug text-slate-900">{article.title}</h2>
                      {article.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{article.excerpt}</p>
                      )}
                      {article.published_at && (
                        <p className="mt-3 text-xs text-slate-400">
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
