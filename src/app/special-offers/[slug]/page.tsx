import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffers, getSpecialOffer } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

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
    const description = offer.bonuses ?? `${offer.title} — exclusive offer at ${SITE_NAME}.`
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/special-offers/${slug}` },
      openGraph: { type: 'article', url: `${SITE_URL}/special-offers/${slug}`, siteName: SITE_NAME, title, description },
      // A hidden offer stays reachable by direct link so it can be reviewed,
      // but it must never enter the index. It is already absent from every
      // listing and from the sitemap; this stops a crawler that finds the URL
      // some other way (a shared link, a referrer) from indexing it.
      ...(offer.active ? {} : { robots: { index: false, follow: false } }),
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
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

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

          {offer.affiliate_url && (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="mt-6 inline-block rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white hover:bg-emerald-700 transition-colors">
              {COPY.specialOffers.claim}
            </a>
          )}

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
