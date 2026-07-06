import type { Metadata } from 'next'
import { getCategories, getCategory } from '@/lib/api'
import { buildItemListSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import Pagination from '@/components/Pagination'
import type { Category } from '@shared/types/category'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = { searchParams: Promise<{ category?: string; page?: string }> }

async function resolve(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const categories = (await getCategories()).data
  const selected = sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : categories[0]?.slug
  return { categories, selected, page }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { selected } = await resolve(searchParams)
  const title = COPY.casinos.pageTitle
  return {
    title,
    description: COPY.casinos.pageDescription,
    alternates: { canonical: selected ? `${SITE_URL}/casinos?category=${selected}` : `${SITE_URL}/casinos` },
    openGraph: { type: 'website', url: `${SITE_URL}/casinos`, siteName: SITE_NAME, title, description: COPY.casinos.pageDescription },
  }
}

export default async function CasinosPage({ searchParams }: Props) {
  const { categories, selected, page } = await resolve(searchParams)

  if (!selected) {
    return (
      <main className="px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.casinos.pageTitle}</h1>
          <p className="mt-4 text-slate-500">{COPY.casinos.noResults}</p>
        </div>
      </main>
    )
  }

  const { category, casinos, meta } = (await getCategory(selected, page)).data
  const basePath = `/casinos?category=${selected}`
  const cats = categories as Category[]

  const listSchema = buildItemListSchema(
    `${category.name} — ${COPY.casinos.pageTitle}`,
    `${SITE_URL}${basePath}`,
    casinos.map((c, i) => ({ position: (meta.current_page - 1) * meta.per_page + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <main className="px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <header className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.casinos.pageTitle}</h1>
            <p className="mt-2 text-slate-500">{COPY.casinos.pageDescription}</p>
          </header>

          {/* Category menu — top of the casinos list */}
          <div className="mb-8"><CategoryNav categories={cats} selected={selected} /></div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-900">{category.name}</h2>
            <span className="text-sm text-slate-400">{meta.total} casinos</span>
          </div>

          {casinos.length === 0 ? (
            <p className="text-slate-500">{COPY.casinos.noResults}</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {casinos.map((casino, i) => (
                <CasinoCard key={casino.id} casino={casino} rank={(meta.current_page - 1) * meta.per_page + i + 1} />
              ))}
            </ol>
          )}

          <Pagination basePath={basePath} current={meta.current_page} last={meta.last_page} />
        </div>
      </main>
    </>
  )
}
