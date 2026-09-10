import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api'
import { LEGAL_PAGES } from '@/constants/legalPages'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'

// The known legal slugs are pre-rendered; any OTHER published CMS page renders
// on demand (and unknown/unpublished slugs 404 via notFound()). Static segments
// (casinos, categories, special-offers) take priority over this dynamic one.
export const dynamicParams = true

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

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
  const headline = page.meta_title ?? page.title
  const title = headline.includes(SITE_NAME) ? headline : `${headline} | ${SITE_NAME}`

  return {
    title: { absolute: title },
    description: page.meta_description ?? undefined,
    alternates: { canonical: `/${slug}` },
    openGraph: { type: 'article', url: `/${slug}`, siteName: SITE_NAME, title: headline, description: page.meta_description ?? undefined },
    // NOINDEX, FOLLOW on the standard legal pages.
    //
    // These eleven are generated from one template for every site in the
    // network (see App\Support\LegalPageContent), so indexing them would put
    // six near-identical copies of the same privacy policy and the same AML
    // statement into the index competing with each other — cannibalisation
    // between our own domains, on pages that were never going to rank anyway.
    //
    // `follow` stays TRUE: the pages must still pass authority back through
    // their internal links, and a visitor reaching one from search is not the
    // problem — a duplicate in the index is.
    //
    // A CMS page that is NOT one of the eleven is bespoke editorial for this
    // site, so it indexes normally.
    robots: LEGAL_PAGES.some((p) => p.slug === slug)
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const label = LEGAL_PAGES.find((p) => p.slug === slug)?.label ?? page.title
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
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block py-1 -my-1 hover:text-emerald-600">Home</Link> / <span className="text-zinc-600">{page.title}</span>
          </nav>

          <h1 className="text-3xl font-bold text-zinc-900">{page.title}</h1>

          <article
            className="prose prose-zinc mt-8 max-w-none prose-headings:font-bold prose-a:text-emerald-600"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </main>
    </>
  )
}
