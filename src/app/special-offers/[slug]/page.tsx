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
  const res = await getSpecialOffers()
  return res.data.map((o) => ({ slug: o.slug }))
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

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-emerald-600">Home</Link> / <Link href="/special-offers" className="hover:text-emerald-600">Special Offers</Link> / <span className="text-zinc-600">{offer.title}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/6] overflow-hidden rounded-2xl bg-zinc-100">
              <Image src={banner} alt={offer.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <h1 className="text-3xl font-bold text-zinc-900">{offer.title}</h1>
          <p className="mt-1 text-amber-500" aria-label={`${offer.rating} out of 5`}>{'★'.repeat(offer.rating)}{'☆'.repeat(5 - offer.rating)}</p>
          {offer.bonuses && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-800">{offer.bonuses}</p>}

          {/* An EXPIRED offer keeps its page — the URL stays valid and the terms
              stay readable — but it must never be presented as claimable. The
              CTA is replaced with a plain statement rather than removed
              silently, so a visitor who followed an old link understands why
              there is nothing to click. Expired offers are already absent from
              every listing; only a direct link reaches this. */}
          {offer.terms?.expired ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
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
              <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="mt-6 inline-block rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white hover:bg-emerald-700 transition-colors">
                {COPY.specialOffers.claim}
              </a>
            )
          )}

          {offer.terms && <BonusTerms terms={offer.terms} />}

          {offer.description && (
            <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: offer.description }} />
          )}

          {offer.casino && (
            <p className="mt-8 text-sm text-zinc-500">
              Offer by <Link href={`/casinos/${offer.casino.slug}`} className="font-semibold text-emerald-600 hover:underline">{offer.casino.name}</Link>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
