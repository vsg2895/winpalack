import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api'
import Byline from '@/components/Byline'
import { LEGAL_PAGES } from '@/constants/legalPages'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { fitDescription, fitTitle, TITLE_MAX, withoutBrandSuffix } from '@/lib/seo/meta'

// The known legal slugs are pre-rendered; any OTHER published CMS page renders
// on demand (and unknown/unpublished slugs 404 via notFound()). Static segments
// (casinos, categories, special-offers) take priority over this dynamic one.
export const dynamicParams = true

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

// The two standard pages that have a schema.org type of their own. Every other
// CMS page — legal or bespoke — stays a plain WebPage.
const PAGE_TYPES: Record<string, 'AboutPage' | 'ContactPage'> = {
  about: 'AboutPage',
  contact: 'ContactPage',
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export function generateStaticParams(): Array<{ slug: string }> {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return { title: 'Page not found' }

  // `meta_title` is authored in the admin as a COMPLETE title and normally
  // already carries the brand ("Responsible Gambling — Viglinksi"). The root
  // layout's `title.template` would then append it a SECOND time, which is how
  // these pages ended up as "… — Brand | Brand".
  //
  // So compose the final value here and mark it `absolute` to opt out of the
  // template — appending the brand only when the authored title genuinely lacks
  // it, so an admin can write the title either way and still get exactly one.
  //
  // Only when that runs past 60 characters does fitTitle take over: the brand
  // tail is dropped first, then the words are cut (lib/seo/meta.ts).
  const headline = page.meta_title ?? page.title
  const namesBrand = SITE_NAME !== '' && headline.includes(SITE_NAME)
  const composed = namesBrand ? headline : `${headline} | ${SITE_NAME}`
  const ownWords = withoutBrandSuffix(headline)

  return {
    title:
      composed.length <= TITLE_MAX
        ? { absolute: composed }
        : fitTitle(ownWords, { brand: !ownWords.includes(SITE_NAME) }),
    description: fitDescription(page.meta_description),
    alternates: { canonical: `/${slug}` },
    openGraph: { type: 'article', url: `/${slug}`, siteName: SITE_NAME, title: headline, description: page.meta_description ?? undefined, images: SHARE_IMAGES },
    /*
     * FROM THE API, not from a list in this file.
     *
     * This used to be `LEGAL_PAGES.some(…)`, which suppressed all ELEVEN
     * standard pages. Six of them deserve it — privacy policy, terms, cookie
     * policy, disclaimer, AML and KYC are generated from one template for every
     * site in the network, so indexing them would put eight near-identical
     * copies into the index competing with each other.
     *
     * The other five do not. /about, /contact, /responsible-gambling,
     * /affiliate-disclosure and /editorial-policy are the pages Google's
     * quality guidance looks for on a gambling affiliate — who runs this site,
     * how it is funded, how operators are assessed — and Search Console was
     * reporting them as "Excluded by noindex". Suppressing them hid the trust
     * signals the whole domain is judged on.
     *
     * So the decision lives in `cms_pages.noindex`, per page and per site: the
     * six legal pages ship true, the five trust pages ship false, and an editor
     * can flip either without a deploy. `follow` stays TRUE on a noindexed
     * page, so it still passes authority through its internal links.
     *
     * A page the API does not flag indexes normally — bespoke editorial for
     * this site is exactly what should be in the index.
     */
    robots: page.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export default async function LegalPage({ params, searchParams }: Props) {
  const { slug } = await params

  /*
   * A CMS PAGE HAS ONE PAGE, so `?page=2` is a page past the end.
   *
   * `/about?page=2` answered 200 with the whole page and an `index` robots tag:
   * a duplicate at a URL of its own. The edge redirect (lib/seo/redirects.ts,
   * rule 2c) cannot catch this route, because a CMS slug is created in the admin
   * and a one-segment rule would also swallow `/casinos?page=2`, which IS paginated.
   * Same 404 as /guides and /countries. `?page=1` never reaches this: proxy.ts
   * 301s it.
   */
  const pageNumber = Math.max(1, Number((await searchParams).page) || 1)
  if (pageNumber > 1) notFound()

  const page = await getPage(slug)
  if (!page) notFound()

  const label = LEGAL_PAGES.find((p) => p.slug === slug)?.label ?? page.title
  // UTC, so the build server's zone cannot move the date a day either way.
  const updated = page.updated_at
    ? new Date(page.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null
  const pageUrl = `${SITE_URL}/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: label, url: pageUrl },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: page.title,
      url: pageUrl,
      description: page.meta_description ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: page.updated_at,
      type: PAGE_TYPES[slug] ?? 'WebPage',
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> / <span className="text-zinc-600">{page.title}</span>
          </nav>

          <h1 className="text-3xl font-bold text-zinc-900">{page.title}</h1>
          {/* The date a policy last changed is part of the policy: "review it
              periodically" means nothing without one. The same value is the
              WebPage's dateModified above, so the page and its markup agree. */}
          {updated && (
            <p className="mt-3 text-sm text-zinc-500">
              Last updated <time dateTime={page.updated_at}>{updated}</time>
            </p>
          )}
          <Byline byline={page.byline} className="mt-3" />

          <article
            className="prose prose-zinc mt-8 max-w-none prose-headings:font-bold prose-a:text-emerald-600"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </main>
    </>
  )
}
