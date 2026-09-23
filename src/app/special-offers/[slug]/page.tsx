import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffers, getSpecialOffer } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import BonusTerms from '@/components/BonusTerms'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  /*
   * Fails CLOSED to an empty list.
   *
   * This runs per request for a slug that was not prerendered, and
   * publicFetch throws on any non-200. Unguarded, a single blip on one
   * endpoint turned the whole route into a 500 — including for slugs that
   * simply do not exist, which should be a plain 404.
   *
   * Returning [] means "nothing is prerendered": the page still renders,
   * still fetches its own data, and still calls notFound() when the record
   * is missing. A build with no params is a slower first hit, not an outage.
   */
  try {
    const res = await getSpecialOffers()
    return res.data.map((o) => ({ slug: o.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: offer } = await getSpecialOffer(slug)
    const title = offer.title
    // `bonuses` is shared master data, identical on every site — so the site's
    // own line is appended to keep the factual bonus lead while making the
    // description unique per domain.
    const description = offer.bonuses
      ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
      : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    // Admin-resolved SEO. Null unless a site pattern or a per-record override
    // exists, so the composed wording above remains the default.
    const seo = offer.seo
    const finalTitle = seo?.title ?? title
    const finalDescription = seo?.description ?? description

    return {
      title: finalTitle,
      description: finalDescription,
      alternates: { canonical: seo?.canonical_url ?? `/special-offers/${slug}` },
      openGraph: {
        type: 'article',
        url: `/special-offers/${slug}`,
        siteName: SITE_NAME,
        title: finalTitle,
        description: finalDescription,
      },
      // Two independent reasons to stay out of the index, and INACTIVE WINS.
      // A hidden offer stays reachable by direct link so it can be reviewed,
      // but it must never be indexed — it is already absent from every listing
      // and from the sitemap, and this stops a crawler that finds the URL some
      // other way from indexing it. `follow: false` there is deliberate and
      // stricter than the editorial noindex below, which keeps follow so the
      // page still passes link equity.
      ...(!offer.active
        ? { robots: { index: false, follow: false } }
        : seo?.noindex
          ? { robots: { index: false, follow: true } }
          : {}),
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function SpecialOfferDetailPage({ params }: Props) {
  const { slug } = await params

  let offer
  try {
    offer = (await getSpecialOffer(slug)).data
  } catch {
    notFound()
  }

  const banner = resolveImageUrl(offer.banner_image ?? offer.image_path)
  const pageUrl = `${SITE_URL}/special-offers/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Special Offers', url: `${SITE_URL}/special-offers` },
      { name: offer.title, url: pageUrl },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: offer.title,
      url: pageUrl,
      description: offer.bonuses ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: offer.updated_at,
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure and two-column shape as the casino page: the
            description runs in the main column, the terms sit in a sticky
            rail beside it. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> / <Link href="/special-offers" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Special Offers</Link> / <span className="text-zinc-600">{offer.title}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/6] overflow-hidden rounded-2xl bg-zinc-100">
              <Image src={banner} alt={offer.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1440px" priority />
            </div>
          )}

          <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 lg:text-4xl">{offer.title}</h1>
            <p className="mt-1 text-amber-500" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}{'☆'.repeat(5 - offer.rating)}</p>
          </div>

          {/* Bonus line and the claim button share the header's right edge on
              desktop — the two things a visitor came for, above the fold. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
          {offer.bonuses && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-800">{offer.bonuses}</p>}

          {/* An EXPIRED offer keeps its page — the URL stays valid and the terms
              stay readable — but it must never be presented as claimable. The
              CTA is replaced with a plain statement rather than removed
              silently, so a visitor who followed an old link understands why
              there is nothing to click. Expired offers are already absent from
              every listing; only a direct link reaches this. */}
          {offer.terms?.expired ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              This offer ended
              {offer.terms.expires_at ? (
                <> on <time dateTime={offer.terms.expires_at}>{offer.terms.expires_at}</time></>
              ) : null}
              . It is no longer available to claim.{' '}
              <Link href="/special-offers" className="underline underline-offset-4">
                See current offers
              </Link>
            </p>
          ) : (
            offer.affiliate_url && (
              <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white hover:bg-emerald-700 transition-colors">
                {COPY.specialOffers.claim}
              </a>
            )
          )}
          </div>
          </header>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
          {/* The rail: terms and the operator link. First in source so the
              wagering requirement is read before the sales copy on phones;
              `lg:order-2` moves it beside the description on desktop. */}
          {(offer.terms || offer.casino) && (
            <aside className="lg:order-2 lg:sticky lg:top-24 lg:self-start [&>section]:mt-0 [&>section]:p-5 lg:[&_dl]:grid-cols-2">
              {offer.terms && <BonusTerms terms={offer.terms} />}

              {/* A card, not a bare line: with no terms to show this is the
                  whole rail, and a lone sentence beside a column of prose
                  reads as a mistake. */}
              {offer.casino && (
                <div className={`rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 ${offer.terms ? 'mt-4' : ''}`}>
                  <p>
                    Offer by <Link href={`/casinos/${offer.casino.slug}`} className="font-semibold text-emerald-600 hover:underline">{offer.casino.name}</Link>
                  </p>
                  <Link href={`/casinos/${offer.casino.slug}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                    Read the safety review →
                  </Link>
                </div>
              )}
            </aside>
          )}

          {offer.description && (
            <div className="prose prose-zinc min-w-0 max-w-none lg:order-1 lg:prose-lg" dangerouslySetInnerHTML={{ __html: offer.description }} />
          )}
          </div>
        </div>
      </main>
    </>
  )
}
