import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories } from '@/lib/api'
import { buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { resolveImageUrl } from '@/lib/images'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.categories.pageTitle,
    description: COPY.categories.pageDescription,
    alternates: { canonical: `/categories` },
    openGraph: { type: 'website', url: `/categories`, siteName: SITE_NAME, title: COPY.categories.pageTitle, description: COPY.categories.pageDescription },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPage) }} />
      <main className="py-6 px-4 sm:px-6 sm:py-12 lg:px-8">
      {/* Same 90rem measure as the other listings; the tiles stay four
          across on desktop, so each one is simply bigger. */}
      <div className="mx-auto max-w-[90rem]">
        <header className="mb-4 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl text-zinc-900">{COPY.categories.pageTitle}</h1>
          <p className="mt-1 text-sm text-zinc-500 sm:mt-2 sm:text-base">{COPY.categories.pageDescription}</p>
        </header>
        {categories.length === 0 ? (
          <p className="text-zinc-500">{COPY.categories.noResults}</p>
        ) : (
          <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="flex h-full items-center justify-center rounded-2xl border border-zinc-100 bg-white p-4 sm:p-6 text-center font-bold text-zinc-800 shadow-sm lg:p-9 lg:text-lg hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                  {/* Stacked, not inline: these cards are centred and one
                      word wide, so a logo beside the label would push long
                      names onto a second line. */}
                  {resolveImageUrl(c.logo_path) && (
                    <img
                      src={resolveImageUrl(c.logo_path)!}
                      alt=""
                      width={44}
                      height={44}
                      className="mx-auto mb-3 h-8 w-8 lg:mb-4 lg:h-11 lg:w-11"
                      aria-hidden
                    />
                  )}
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
