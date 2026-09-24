import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getArticle, getEditorial, getSiteFeatures } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

/*
 * NO generateStaticParams, deliberately — this route renders on demand.
 *
 * Next classifies a dynamic route from what that function RETURNS: a non-empty
 * list builds `f` (dynamic), an EMPTY list builds a fully static route. A
 * static render then throws DYNAMIC_SERVER_USAGE, because the root layout
 * reads the session cookie for the header's account control and a static
 * render may not touch cookies — taking the whole route down with a 500 for
 * every slug, valid or not.
 *
 * Not hypothetical: that is exactly how /special-offers/[slug] broke on the
 * one site with no visible offers. It was reachable here too, because the
 * params lookup failed CLOSED to an empty list, so one API blip was enough to
 * change the build shape.
 *
 * Removing the function pins the route dynamic whatever the data does.
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

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
