import type { Metadata } from 'next'
import { getSpecialOffers } from '@/lib/api'
import { buildWebPageSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import SpecialOfferCard from '@/components/SpecialOfferCard'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.specialOffers.pageTitle,
    description: COPY.specialOffers.pageDescription,
    alternates: { canonical: `${SITE_URL}/special-offers` },
    openGraph: { type: 'website', url: `${SITE_URL}/special-offers`, siteName: SITE_NAME, title: COPY.specialOffers.pageTitle, description: COPY.specialOffers.pageDescription },
  }
}

export default async function SpecialOffersPage() {
  const res = await getSpecialOffers()
  const offers = res.data

  // These listing pages carried no structured data at all. A WebPage node
  // anchors them into the site graph so they are not read as orphans.
  const webPage = buildWebPageSchema({
    name: COPY.specialOffers.pageTitle,
    url: `${SITE_URL}/special-offers`,
    description: COPY.specialOffers.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <main className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">{COPY.specialOffers.pageTitle}</h1>
          <p className="mt-2 text-zinc-500">{COPY.specialOffers.pageDescription}</p>
        </header>
        {offers.length === 0 ? (
          <p className="text-zinc-500">{COPY.specialOffers.noResults}</p>
        ) : (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
      </main>
    </>
  )
}
