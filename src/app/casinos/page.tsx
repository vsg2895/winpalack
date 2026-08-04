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
  // `requested` is the category the URL actually asked for; `selected` falls back
  // to the first category so the page always renders something. The two must stay
  // distinct: the canonical may only reflect what was requested, or the clean
  // /casinos URL would declare itself a duplicate of /casinos?category=<first>.
  const requested =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : undefined
  const selected = requested ?? categories[0]?.slug
  return { categories, requested, selected, page }
}

/**
 * The canonical URL for a listing view, carrying only the parameters that
 * genuinely change the content.
 */
function canonicalFor(requested: string | undefined, page: number): string {
  const params = new URLSearchParams()
  if (requested) params.set('category', requested)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()

  return `${SITE_URL}/casinos${qs ? `?${qs}` : ''}`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { requested, page } = await resolve(searchParams)
  // Page 2+ gets its own title so paginated views are not reported as duplicate
  // titles, and so a searcher landing on one knows where they are.
  const title = page > 1 ? `${COPY.casinos.pageTitle} — Page ${page}` : COPY.casinos.pageTitle
  const canonical = canonicalFor(requested, page)

  return {
    title,
    description: COPY.casinos.pageDescription,
    // Self-referencing canonical. Pointing page 3 back at page 1 (the previous
    // behaviour) tells Google the deeper pages are duplicates of the first, so
    // the casinos listed only on those pages never get indexed.
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description: COPY.casinos.pageDescription },
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
