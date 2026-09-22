import type { Metadata } from 'next'
import { getBonusArea, getSpecialOffers } from '@/lib/api'
import { buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.specialOffers.pageTitle,
    description: COPY.specialOffers.pageDescription,
    alternates: { canonical: `/special-offers` },
    openGraph: { type: 'website', url: `/special-offers`, siteName: SITE_NAME, title: COPY.specialOffers.pageTitle, description: COPY.specialOffers.pageDescription },
  }
}

export default async function SpecialOffersPage() {
  // Both, deliberately.
  //
  // The Bonus payload supplies the grouping and the section titles. The flat
  // list is what catches offers filed under NO category — without it an
  // uncategorised offer would silently vanish from the page it has always
  // appeared on, which is a regression dressed up as a feature.
  const [res, sections] = await Promise.all([getSpecialOffers(), getBonusArea({ full: true })])
  const offers = res.data

  const grouped = sections.filter((section) => section.offers.length > 0)
  const shownIds = new Set(grouped.flatMap((section) => section.offers.map((offer) => offer.id)))
  const ungrouped = offers.filter((offer) => !shownIds.has(offer.id))

  // These listing pages carried no structured data at all. A WebPage node
  // anchors them into the site graph so they are not read as orphans.
  const webPage = buildWebPageSchema({
    name: COPY.specialOffers.pageTitle,
    url: `${SITE_URL}/special-offers`,
    description: COPY.specialOffers.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPage) }} />
      <main className="py-12 px-4 sm:px-6 lg:px-8">
      {/* Same 90rem measure and compact four-up grid as the home page's Bonus
          strip, so the listing is the strip with the caps lifted. */}
      <div className="mx-auto max-w-[90rem]">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">{COPY.specialOffers.pageTitle}</h1>
          <p className="mt-2 text-zinc-500">{COPY.specialOffers.pageDescription}</p>
        </header>
        {offers.length === 0 ? (
          <p className="text-zinc-500">{COPY.specialOffers.noResults}</p>
        ) : grouped.length > 0 ? (
          /* Grouped under each category's own title, matching the home page and
             the Bonus menu. The ids are what the menu's anchors point at, so
             arriving from the dropdown lands on the right heading. */
          <div className="space-y-12">
            {grouped.map((section) => (
              <section key={section.id} id={`bonus-${section.slug}`} className="scroll-mt-24">
                <div className="mb-5">
                  <h2 className="font-display text-xl font-semibold text-zinc-900">{section.name}</h2>
                  {section.description && <p className="mt-1 text-zinc-500">{section.description}</p>}
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
                </div>
              </section>
            ))}

            {/* Offers filed under no category. Shown rather than dropped — see
                the fetch above. */}
            {ungrouped.length > 0 && (
              <section id="bonus-other" className="scroll-mt-24">
                <h2 className="mb-6 font-display text-2xl font-semibold text-zinc-900">
                  {COPY.specialOffers.otherOffers}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {ungrouped.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* No Bonus area on this site — the flat list it has always been. */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
          </div>
        )}
      </div>
      </main>
    </>
  )
}
