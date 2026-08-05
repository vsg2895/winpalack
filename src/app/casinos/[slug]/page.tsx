import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCasinos, getCasino } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import { COPY } from '@/constants/copy'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const res = await getCasinos()
  return res.data.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: casino } = await getCasino(slug)
    const title = casino.meta_title ?? `${casino.name} Review`
    const description = casino.meta_description ?? `Read our review of ${casino.name}.`
    return {
      title,
      description,
      alternates: { canonical: `${SITE_URL}/casinos/${slug}` },
      openGraph: { type: 'article', url: `${SITE_URL}/casinos/${slug}`, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CasinoDetailPage({ params }: Props) {
  const { slug } = await params

  let casino
  try {
    casino = (await getCasino(slug)).data
  } catch {
    notFound()
  }

  const banner = resolveImageUrl(casino.banner_image)
  const logo = resolveImageUrl(casino.image_path)
  const pageUrl = `${SITE_URL}/casinos/${slug}`
  const reviewSchema = buildCasinoReviewSchema(casino)
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Casinos', url: `${SITE_URL}/casinos` },
      { name: casino.name, url: pageUrl },
    ],
    pageUrl,
  )
  // One graph per page: the WebPage node anchors this URL into the site graph
  // and points at its own breadcrumb, so the review and the trail are read as
  // parts of one page rather than three unrelated blocks.
  const graph = [
    buildWebPageSchema({
      name: `${casino.name} Review`,
      url: pageUrl,
      description: casino.meta_description ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    reviewSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-emerald-600">Home</Link> / <Link href="/casinos" className="hover:text-emerald-600">Casinos</Link> / <span className="text-zinc-600">{casino.name}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/5] overflow-hidden rounded-2xl bg-zinc-100">
              <Image src={banner} alt={`${casino.name} banner`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}

          <header className="flex items-center gap-4">
            {logo && <Image src={logo} alt={`${casino.name} logo`} width={64} height={64} className="rounded object-contain" />}
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">{casino.name}</h1>
              <p className="mt-1 text-amber-500" aria-label={`${casino.rating} out of 5`}>{'★'.repeat(casino.rating)}{'☆'.repeat(5 - casino.rating)}</p>
            </div>
          </header>

          {casino.bonuses && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-800">{casino.bonuses}</p>
          )}

          <a href={casino.attachment.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="mt-6 inline-block rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white hover:bg-emerald-700 transition-colors">
            {COPY.casinos.visitCasino}
          </a>

          {casino.description && (
            <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: casino.description }} />
          )}

          {casino.categories && casino.categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {casino.categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-200">{c.name}</Link>
              ))}
            </div>
          )}

          <CasinoSpecialOffers offers={casino.special_offers ?? []} />
        </div>
      </main>
    </>
  )
}
