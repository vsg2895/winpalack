import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories } from '@/lib/api'
import { buildWebPageSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.categories.pageTitle,
    description: COPY.categories.pageDescription,
    alternates: { canonical: `${SITE_URL}/categories` },
    openGraph: { type: 'website', url: `${SITE_URL}/categories`, siteName: SITE_NAME, title: COPY.categories.pageTitle, description: COPY.categories.pageDescription },
  }
}

export default async function CategoriesPage() {
  const res = await getCategories()
  const categories = res.data

  // These listing pages carried no structured data at all. A WebPage node
  // anchors them into the site graph so they are not read as orphans.
  const webPage = buildWebPageSchema({
    name: COPY.categories.pageTitle,
    url: `${SITE_URL}/categories`,
    description: COPY.categories.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <main className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">{COPY.categories.pageTitle}</h1>
          <p className="mt-2 text-zinc-500">{COPY.categories.pageDescription}</p>
        </header>
        {categories.length === 0 ? (
          <p className="text-zinc-500">{COPY.categories.noResults}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="block rounded-2xl border border-zinc-100 bg-white p-6 text-center font-semibold text-zinc-800 shadow-sm hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
    </>
  )
}
