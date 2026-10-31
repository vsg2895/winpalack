import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAuthor } from '@/lib/api'
import { buildBreadcrumbSchema, buildPersonSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { SITE_URL } from '@/lib/config'
import { fitDescription, fitTitle } from '@/lib/seo/meta'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

/*
 * NO generateStaticParams, for the same reason as /guides/[slug]: an empty
 * list (a site with no visible authors yet) would build this route static,
 * and the root layout's cookie read would then 500 every author page. The
 * per-fetch cache and its `authors` tag still apply.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getAuthor(slug)
  if (!data) return { title: 'Page not found' }

  const { author } = data
  const title = author.role ? `${author.name}, ${author.role}` : author.name
  const description = author.short_bio ?? `Reviews and articles by ${author.name} on ${SITE_NAME}.`

  return {
    title: fitTitle(title),
    description: fitDescription(description),
    alternates: { canonical: `/authors/${slug}` },
    openGraph: { type: 'profile', url: `/authors/${slug}`, siteName: SITE_NAME, title, description },
  }
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const data = await getAuthor(slug)
  if (!data) notFound()

  const { author, casinos, articles } = data
  const photo = resolveImageUrl(author.photo_path)
  const pageUrl = `${SITE_URL}/authors/${author.slug}`

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: author.name, url: pageUrl },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: author.name,
      url: pageUrl,
      description: author.short_bio ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: author.updated_at ?? undefined,
    }),
    breadcrumb,
    buildPersonSchema(author, photo),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> /{' '}
            <span className="text-zinc-600">{author.name}</span>
          </nav>

          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {photo && (
              <Image
                src={photo}
                alt={author.name}
                width={128}
                height={128}
                className="h-32 w-32 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
              />
            )}
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-semibold text-slate-900">{author.name}</h1>
              {author.role && <p className="mt-1 text-lg text-emerald-700">{author.role}</p>}
              {author.short_bio && <p className="mt-3 text-slate-600">{author.short_bio}</p>}
              {author.expertise.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Expertise">
                  {author.expertise.map((tag) => (
                    <li key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{tag}</li>
                  ))}
                </ul>
              )}
              {author.profile_links.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {author.profile_links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="me noopener noreferrer" className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>

          {author.long_bio && (
            <section className="mt-10" aria-labelledby="about-author">
              <h2 id="about-author" className="font-display text-2xl font-semibold text-slate-900">About {author.name}</h2>
              <div
                className="prose prose-zinc mt-4 max-w-none prose-a:text-emerald-600"
                dangerouslySetInnerHTML={{ __html: author.long_bio }}
              />
            </section>
          )}

          {casinos.length > 0 && (
            <section className="mt-10" aria-labelledby="author-casinos">
              <h2 id="author-casinos" className="font-display text-2xl font-semibold text-slate-900">Casino reviews</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {casinos.map((casino) => {
                  const logo = resolveImageUrl(casino.image_path)
                  return (
                    <li key={casino.slug}>
                      <Link href={`/casinos/${casino.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-300">
                        {logo && <Image src={logo} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-contain" />}
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{casino.name}</span>
                          <span className="block text-xs text-slate-500">{casino.credit === 'author' ? 'Written by' : 'Reviewed by'} {author.name}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {articles.length > 0 && (
            <section className="mt-10" aria-labelledby="author-articles">
              <h2 id="author-articles" className="font-display text-2xl font-semibold text-slate-900">Articles</h2>
              <ul className="mt-4 divide-y divide-slate-200">
                {articles.map((article) => {
                  const date = formatDate(article.published_at)
                  return (
                    <li key={`${article.type}:${article.slug}`} className="py-4">
                      <Link href={`/${article.type === 'news' ? 'news' : 'guides'}/${article.slug}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                        {article.title}
                      </Link>
                      {article.excerpt && <p className="mt-1 text-sm text-slate-600">{article.excerpt}</p>}
                      <p className="mt-1 text-xs text-slate-400">
                        {article.credit === 'author' ? 'Written' : 'Reviewed'}
                        {date && article.published_at && <> · <time dateTime={article.published_at}>{date}</time></>}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {casinos.length === 0 && articles.length === 0 && (
            <p className="mt-10 text-slate-500">No published reviews or articles yet.</p>
          )}
        </div>
      </main>
    </>
  )
}
