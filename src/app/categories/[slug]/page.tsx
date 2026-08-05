import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategories, getCategory } from '@/lib/api'
import { buildItemListSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import Pagination from '@/components/Pagination'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

/** Canonical URL for a category view — page number only when past the first. */
function canonicalFor(slug: string, page: number): string {
  return `${SITE_URL}/categories/${slug}${page > 1 ? `?page=${page}` : ''}`
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const res = await getCategories()
  return res.data.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)
  try {
    const { data } = await getCategory(slug, page)
    // Distinct title per page so paginated views are never reported as duplicates.
    const title = page > 1 ? `${data.category.name} Casinos — Page ${page}` : `${data.category.name} Casinos`
    const description = `Best ${data.category.name} casinos reviewed by ${SITE_NAME}.`
    const canonical = canonicalFor(slug, page)

    return {
      title,
      description,
      // Self-referencing canonical: this route is now the canonical home of a
      // category, and /casinos?category=<slug> 301s here (see next.config).
      alternates: { canonical },
      openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)

  let payload
  try {
    payload = (await getCategory(slug, page)).data
  } catch {
    notFound()
  }

  const { category, casinos, meta } = payload
  // Position continues across pages so the ItemList reflects the real ranking
  // rather than restarting at 1 on every page.
  const offset = ((meta?.current_page ?? page) - 1) * (meta?.per_page ?? casinos.length)
  const listSchema = buildItemListSchema(
    `${category.name} Casinos`,
    canonicalFor(slug, page),
    casinos.map((c, i) => ({ position: offset + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )
  const pageUrl = canonicalFor(slug, page)
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Categories', url: `${SITE_URL}/categories` },
      { name: category.name, url: `${SITE_URL}/categories/${slug}` },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: `${category.name} Casinos`,
      url: pageUrl,
      description: `Best ${category.name} casinos reviewed by ${SITE_NAME}.`,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    listSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-emerald-600">Home</Link> / <Link href="/categories" className="hover:text-emerald-600">Categories</Link> / <span className="text-zinc-600">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-zinc-900">{category.name} Casinos</h1>
          {casinos.length === 0 ? (
            <p className="mt-6 text-zinc-500">{COPY.casinos.noResults}</p>
          ) : (
            <ol className="mt-8 flex flex-col gap-4">
              {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={offset + i + 1} />)}
            </ol>
          )}
          <Pagination basePath={`/categories/${slug}`} current={meta?.current_page ?? 1} last={meta?.last_page ?? 1} />
        </div>
      </main>
    </>
  )
}
