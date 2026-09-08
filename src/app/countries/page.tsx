import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCountries } from '@/lib/api'
import { resolveImageUrl } from '@/lib/images'
import { buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  // A site with the feature off must not advertise the page in search results
  // either, so the metadata is generated only when the data exists.
  const res = await getCountries()

  if (res === null) {
    return { title: COPY.errors.notFound, robots: { index: false, follow: false } }
  }

  return {
    title: COPY.countries.pageTitle,
    description: COPY.countries.pageDescription,
    alternates: { canonical: `/countries` },
    openGraph: {
      type: 'website',
      url: `/countries`,
      siteName: SITE_NAME,
      title: COPY.countries.pageTitle,
      description: COPY.countries.pageDescription,
    },
  }
}

export default async function CountriesPage() {
  const res = await getCountries()

  // Null means this site has the countries filter switched off. A 404 is the
  // honest answer — the page genuinely does not exist here — and it matches what
  // the API itself returns.
  if (res === null) notFound()

  const continents = res.data

  const webPage = buildWebPageSchema({
    name: COPY.countries.pageTitle,
    url: `${SITE_URL}/countries`,
    description: COPY.countries.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPage) }} />
      <main className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-10">
            <h1 className="font-display text-3xl font-bold text-slate-900">{COPY.countries.pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-slate-500">{COPY.countries.pageDescription}</p>
          </header>

          {continents.length === 0 ? (
            <p className="text-slate-500">{COPY.countries.noResults}</p>
          ) : (
            <div className="space-y-12">
              {continents.map((continent) => (
                <section key={continent.id} aria-labelledby={`continent-${continent.slug}`}>
                  <h2
                    id={`continent-${continent.slug}`}
                    className="font-display text-xl font-semibold text-slate-900"
                  >
                    {continent.name}
                  </h2>

                  <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {(continent.countries ?? []).map((country) => {
                      const flag = resolveImageUrl(country.image_path)

                      return (
                        <li key={country.id}>
                          <Link
                            href={`/countries/${country.slug}`}
                            className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-5 text-center shadow-sm transition-colors hover:border-emerald-300"
                          >
                            {flag ? (
                              // Flags are small, fixed-size and above the fold on
                              // this page, so they are eager rather than lazy —
                              // lazy-loading a 32px icon costs more than it saves.
                              <Image
                                src={flag}
                                alt=""
                                width={64}
                                height={64}
                                unoptimized
                                className="h-16 w-16 rounded-full object-cover shadow-sm"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-400"
                              >
                                {country.code ?? '—'}
                              </span>
                            )}

                            <span className="font-semibold text-slate-800 group-hover:text-emerald-700">
                              {country.name}
                            </span>

                            {typeof country.casinos_count === 'number' && (
                              <span className="text-xs text-slate-400">
                                {COPY.countries.casinoCount(country.casinos_count)}
                              </span>
                            )}

                            <span className="mt-auto w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm shadow-emerald-500/25">
                              {COPY.countries.showCasinos}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
