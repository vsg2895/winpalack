import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api'
import { LEGAL_PAGES } from '@/constants/legalPages'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor } from '@/lib/seo'

// The known legal slugs are pre-rendered; any OTHER published CMS page renders
// on demand (and unknown/unpublished slugs 404 via notFound()). Static segments
// (casinos, categories, special-offers) take priority over this dynamic one.
export const dynamicParams = true

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams(): Array<{ slug: string }> {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return { title: 'Page not found' }

  const title = page.meta_title ?? page.title
  return {
    title,
    description: page.meta_description ?? undefined,
    alternates: { canonical: `${SITE_URL}/${slug}` },
    openGraph: { type: 'article', url: `${SITE_URL}/${slug}`, siteName: SITE_NAME, title, description: page.meta_description ?? undefined },
    robots: { index: true, follow: true },
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
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-emerald-600">Home</Link> / <span className="text-zinc-600">{page.title}</span>
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
