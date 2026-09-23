import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getArticle, getArticles, getEditorial, getSiteFeatures } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

/**
 * One guide.
 *
 * A Server Component throughout — this is the page whose whole purpose is to be
 * indexed, so nothing about it may depend on client JavaScript.
 *
 * Unlike the index, a single guide does NOT apply the three-article threshold:
 * once something is published its URL must keep working, or a shared link breaks
 * the moment an older guide is unpublished.
 */

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  /*
   * Fails CLOSED to an empty list.
   *
   * This runs per request for a slug that was not prerendered, and
   * publicFetch throws on any non-200. Unguarded, a single blip on one
   * endpoint turned the whole route into a 500 — including for slugs that
   * simply do not exist, which should be a plain 404.
   *
   * Returning [] means "nothing is prerendered": the page still renders,
   * still fetches its own data, and still calls notFound() when the record
   * is missing. A build with no params is a slower first hit, not an outage.
   */
  try {
    const articles = await getArticles()
    return articles.map((a) => ({ slug: a.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) return { title: COPY.errors.notFound }

  const title = article.meta_title ?? article.title
  const description = article.meta_description ?? article.excerpt ?? COPY.guides.pageDescription

  return {
    title,
    description,
    alternates: { canonical: article.canonical_url ?? `/guides/${slug}` },
    ...(article.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'article',
      url: `/guides/${slug}`,
      siteName: SITE_NAME,
      title,
      description,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params

  const { guides_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const article = await getArticle(slug)
  if (!article) notFound()

  // Reused from 3.10 — the same person named on the casino reviews. Null unless
  // the site configured a byline, and then no author is claimed anywhere.
  const { author } = await getEditorial()

  const hero = resolveImageUrl(article.hero_image_path)
  const pageUrl = `${SITE_URL}/guides/${slug}`

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: COPY.guides.pageTitle, url: `${SITE_URL}/guides` },
      { name: article.title, url: pageUrl },
    ],
    pageUrl,
  )

  // NewsArticle rather than Article: this is dated editorial with a byline,
  // which is what the type describes. `author` is omitted entirely when the site
  // has no named reviewer — an authorship claim we cannot point at is worse than
  // none, the same rule the casino Review schema follows.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    ...(hero ? { image: hero } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.updated_at ? { dateModified: article.updated_at } : {}),
    ...(author ? { author: { '@type': 'Person', name: author.name } } : {}),
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: pageUrl,
  }

  const graph = [
    buildWebPageSchema({
      name: article.title,
      url: pageUrl,
      description: article.excerpt ?? COPY.guides.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: article.updated_at ?? undefined,
    }),
    breadcrumb,
    articleSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <article className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> /{' '}
            <Link href="/guides" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">{COPY.guides.pageTitle}</Link> /{' '}
            <span className="text-zinc-600">{article.title}</span>
          </nav>

          {hero && (
            <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl bg-zinc-100">
              <Image src={hero} alt={article.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <h1 className="font-display text-4xl font-semibold text-slate-900">{article.title}</h1>

          <p className="mt-3 text-sm text-slate-500">
            {author && <span className="font-semibold text-slate-700">{author.name}</span>}
            {author && article.published_at && ' · '}
            {article.published_at && (
              <time dateTime={article.published_at}>
                {new Date(article.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
          </p>

          {article.excerpt && <p className="mt-6 text-lg text-slate-600">{article.excerpt}</p>}

          {article.body && (
            <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: article.body }} />
          )}

          {/* Affiliate disclosure, unconditional. A guide may link to an operator
              and the reader is entitled to know how this site is paid — the
              layout's 18+ and responsible-gambling links stay in place around it. */}
          <p className="mt-10 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            {COPY.guides.affiliateDisclosure}
          </p>

          <p className="mt-8 text-sm">
            <Link href="/guides" className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
              {COPY.guides.backToIndex}
            </Link>
          </p>
        </article>
      </main>
    </>
  )
}
