import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategories, getCategory } from '@/lib/api'
import { buildItemListSchema, buildBreadcrumbSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const res = await getCategories()
  return res.data.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data } = await getCategory(slug)
    const title = `${data.category.name} Casinos`
    const description = `Best ${data.category.name} casinos reviewed by ${SITE_NAME}.`
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/categories/${slug}` },
      openGraph: { type: 'website', url: `${SITE_URL}/categories/${slug}`, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params

  let payload
  try {
    payload = (await getCategory(slug)).data
  } catch {
    notFound()
  }

  const { category, casinos, meta } = payload
  // Only offer "See More" when the category holds more casinos than this page
  // shows — otherwise the link leads to the same list the visitor is reading.
  const hasMoreCasinos = (meta?.total ?? 0) > casinos.length
  const listSchema = buildItemListSchema(
    `${category.name} Casinos`,
    `${SITE_URL}/categories/${slug}`,
    casinos.map((c, i) => ({ position: i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Categories', url: `${SITE_URL}/categories` },
    { name: category.name, url: `${SITE_URL}/categories/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

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
              {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} />)}
            </ol>
          )}

          {hasMoreCasinos && (
            <div className="mt-8 text-center">
              <Link href={`/casinos?category=${slug}`} aria-label={`See all ${category.name} casinos`} className="inline-flex rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
                See More →
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
