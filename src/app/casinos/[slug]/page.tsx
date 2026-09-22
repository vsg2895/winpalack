import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCasinos, getCasino, getEditorial, getSiteFeatures } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import BonusTerms from '@/components/BonusTerms'
import CasinoProfile from '@/components/CasinoProfile'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import CasinoReviews from '@/components/CasinoReviews'
import CountryStrip from '@/components/CountryStrip'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

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
    // A casino record is shared by every site, so the fallback must carry THIS
    // site's voice — otherwise all four domains ship the same description for
    // the same casino. An admin-set meta_description still wins, and is shared
    // by design; per-site overrides would need columns on the casino_site pivot.
    // An admin-entered meta_description is shared master data, so this site's
    // short signature is appended rather than the value being used verbatim —
    // otherwise filling the field in the admin would put the identical
    // description back on all four domains. No value set: fall back to the
    // site's own full line.
    const description = casino.meta_description
      ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
      : `${casino.name} — ${COPY.casinos.reviewSummary}`
    // The `title` above is the casino's own meta_title — shared master data, so
    // it is byte-identical on every domain in the network. The share card is
    // where that was most visible: six results, one headline. This site's tail
    // makes the card its own without touching the shared record.
    const shareTitle = `${title} — ${COPY.casinos.reviewTitleTail}`
    // Admin-resolved SEO, when this site has patterns or per-record overrides.
    // `seo.title` / `seo.description` are null unless something was configured,
    // so the composed wording above stays the default and nothing changes for a
    // site that has not adopted this.
    const seo = casino.seo
    const finalTitle = seo?.title ?? title
    const finalDescription = seo?.description ?? description

    return {
      title: finalTitle,
      description: finalDescription,
      // A canonical override is how duplicate content between our six domains
      // gets resolved deliberately instead of Google picking a winner.
      alternates: { canonical: seo?.canonical_url ?? `/casinos/${slug}` },
      // noindex is per record, set in the admin. `follow` is kept so the page
      // still passes link equity to the casinos and categories it points at.
      ...(seo?.noindex ? { robots: { index: false, follow: true } } : {}),
      openGraph: {
        type: 'article',
        url: `/casinos/${slug}`,
        siteName: SITE_NAME,
        title: shareTitle,
        description: finalDescription,
      },
      twitter: { card: 'summary_large_image', title: shareTitle, description: finalDescription },
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

  // The "Accepts players from" section was removed from this page, and
  // countries_enabled went with it — it gated only those chips. The /countries
  // hub itself is untouched and still honours the flag on its own routes.
  const { operator_profile_enabled: profileEnabled } = await getSiteFeatures()

  // Who stands behind this review, and where the method is written down. Both
  // null unless the site configured them — no placeholder is ever shown.
  const { author, methodology_page_slug: methodologySlug } = await getEditorial()

  const banner = resolveImageUrl(casino.banner_image)
  const logo = resolveImageUrl(casino.image_path)
  const pageUrl = `${SITE_URL}/casinos/${slug}`
  // Facts for the summary panel below the CTA.
  const categoryNames = (casino.categories ?? []).map((c) => c.name)
  const liveOffers = (casino.special_offers ?? []).length
  // `updated_at` already travels to JSON-LD as `dateModified` and has never been
  // shown to the reader. Guarded rather than trusted: a malformed date must not
  // throw during a server render and take the whole page down with it.
  const checkedOn = (() => {
    const parsed = new Date(casino.updated_at)
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  })()
  // Chosen in the admin on the casino record. Already resolved in the API
  // payload and, until now, rendered nowhere.
  const featuredOffer = casino.featured_special_offer ?? null
  // The editorial review date — a person's act, unlike updated_at. Null when
  // nobody recorded one, and nothing is claimed in that case.
  const reviewedOn = (() => {
    if (!casino.reviewed_at) return null
    const parsed = new Date(casino.reviewed_at)
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  })()
  // Author passed in so the markup and the visible byline make the same
  // claim — never one without the other.
  const reviewSchema = buildCasinoReviewSchema(casino, author)
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
      // Same composition as the <meta> description in generateMetadata. Passing
      // the raw shared `meta_description` here put an identical WebPage
      // description on all six domains for the same casino.
      description: casino.meta_description
        ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
        : `${casino.name} — ${COPY.casinos.reviewSummary}`,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: casino.updated_at,
    }),
    breadcrumb,
    reviewSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure as the listings. The width is spent on a
            two-column layout from `lg`: the review, offers and player reviews
            run in the main column, the safety record sits in a sticky rail
            beside them — a single column at this measure would put the
            description on a 200-character line. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> / <Link href="/casinos" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Casinos</Link> / <span className="text-zinc-600">{casino.name}</span>
          </nav>

          {banner && (
            <div className="relative mb-6 aspect-[16/5] overflow-hidden rounded-2xl bg-zinc-100">
              <Image src={banner} alt={`${casino.name} banner`} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 1440px" priority />
            </div>
          )}

          <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {logo && <Image src={logo} alt={`${casino.name} logo`} width={80} height={80} sizes="(min-width: 1024px) 80px, 64px" className="h-16 w-16 rounded object-contain lg:h-20 lg:w-20" />}
            <div>
              {/* Per-site pivot flag — see CasinoCard for why it lives on the
                  attachment rather than on the casino. */}
              {casino.attachment.featured && (
                <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <span aria-hidden>◆</span>
                  {COPY.casinos.featuredBadge}
                </p>
              )}
              <h1 className="text-3xl font-bold text-zinc-900 lg:text-4xl">{casino.name}</h1>
              <p className="mt-1 text-amber-500" aria-label={`${casino.rating} out of 5`}>{'★'.repeat(casino.rating)}{'☆'.repeat(5 - casino.rating)}</p>
            </div>
          </div>

          {/* Bonus line and the primary CTA share the header's right edge on
              desktop — the two things a visitor came for, without scrolling. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
          {casino.bonuses && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-800">{casino.bonuses}</p>
          )}

          {/* /go carries the click count and keeps the destination editable. */}
          <a href={`/go/${casino.slug}`} target="_blank" rel="nofollow sponsored noopener" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white hover:bg-emerald-700 transition-colors">
            {COPY.casinos.visitCasino}
          </a>
          </div>
          </header>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
          {/* The rail. First in source so the at-a-glance facts still read
              before the long description on phones, where the columns stack;
              on desktop `lg:order-2` moves it to the right and `sticky` keeps
              it in view while the review scrolls. */}
          <aside className="lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {/* Summary panel — the same at-a-glance facts the sibling sites show,
              so a reader gets rating, offer count, categories and revision date
              without scrolling the review. Every row is conditional: a casino
              with no offers or no categories simply renders fewer rows. */}
          {/*
            Redesigned from a flat 3-column dl.
            Two things were wrong with it. Four facts in three columns left the
            fourth stranded alone on a second row with a column and a half of
            dead space beside it — which is what the panel looked like in
            practice, not in theory. And every fact was typeset identically, so
            the safety score carried exactly the same weight as the date the
            entry was edited.
            Now: the score is promoted into the header as a badge (the stars
            already appear above, so repeating them here would be a third copy of
            the same claim), and the remaining facts sit in a 2-column grid that
            fills evenly whether there are two of them or four.
          */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" aria-labelledby="at-a-glance">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
              <h2 id="at-a-glance" className="text-lg font-bold text-zinc-900 sm:text-xl">
                {casino.name} {COPY.casinos.glanceHeadingTail}
              </h2>
              <p
                className="inline-flex items-baseline gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 ring-1 ring-emerald-100"
                aria-label={`${COPY.casinos.rating}: ${casino.rating} out of 5`}
              >
                <span className="text-base font-bold leading-none text-emerald-800">{casino.rating}</span>
                <span className="text-xs font-semibold text-emerald-600/80">/ 5</span>
                <span className="ml-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700/70">
                  {COPY.casinos.rating}
                </span>
              </p>
            </div>

            {/* Two columns, not three: four facts divide evenly, and three still
                leave only one short cell rather than a row and a half of gap. */}
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-1">
              {liveOffers > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Offers listed</dt>
                  <dd className="mt-1 text-zinc-800">
                    {liveOffers} {liveOffers === 1 ? 'offer' : 'offers'} on this page
                  </dd>
                </div>
              )}
              {categoryNames.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Listed under</dt>
                  <dd className="mt-1 text-zinc-800">{categoryNames.join(', ')}</dd>
                </div>
              )}
              {/* Where this casino accepts players — the same strip the listing
                  cards use, so the two surfaces cannot describe one casino
                  differently. Its own caption is suppressed because the <dt>
                  beside it already carries the words. */}
              {casino.countries && casino.countries.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    {COPY.casinos.countriesHeading}
                  </dt>
                  <dd className="mt-1.5">
                    <CountryStrip countries={casino.countries} showHeading={false} />
                  </dd>
                </div>
              )}
              {checkedOn && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{COPY.casinos.lastChecked}</dt>
                  {/* <time> so the machine-readable date matches the one in
                      JSON-LD rather than being a second, looser claim. */}
                  <dd className="mt-1 text-zinc-800">
                    <time dateTime={casino.updated_at}>{checkedOn}</time>
                  </dd>
                </div>
              )}
            </dl>

            {author && reviewedOn && (
              <div className="px-6 pb-5">
            {/* The byline. Rendered ONLY when the site has named a real person
                AND someone recorded a review date for this casino — either
                missing and the claim is not made at all. A byline without a
                date, or a date without a name, would both assert more than we
                can support. */}
            {author && reviewedOn && (
              <p className="border-t border-zinc-100 pt-4 text-sm text-zinc-600">
                {COPY.casinos.reviewedOn}{' '}
                <span className="font-semibold text-zinc-800">{author.name}</span>
                {author.role && <span className="text-zinc-500"> · {author.role}</span>}
                {' · '}
                <time dateTime={casino.reviewed_at ?? undefined}>{reviewedOn}</time>
                {methodologySlug && (
                  <>
                    {' · '}
                    <Link href={`/${methodologySlug}`} className="underline underline-offset-4 hover:text-emerald-700">
                      {COPY.casinos.methodologyLink}
                    </Link>
                  </>
                )}
              </p>
            )}
              </div>
            )}
          </section>
          </aside>

          {/* Every block below carries its own `mt-8`; the first one loses it
              so the column starts level with the rail. */}
          <div className="min-w-0 lg:order-1 [&>*:first-child]:mt-0">
          {/* The factual profile. Gated on this site's own flag, and the API
              omits `detail` entirely when nothing has been filled in, so the
              block disappears in both the "switched off" and the "no data yet"
              cases without the page having to reason about the difference. */}
          {profileEnabled && casino.detail && (
            <CasinoProfile detail={casino.detail} casinoName={casino.name} />
          )}

          {casino.description && (
            <div className="prose prose-zinc mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: casino.description }} />
          )}

          {casino.categories && casino.categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {casino.categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-200">{c.name}</Link>
              ))}
            </div>
          )}

          {/* The casino's promoted offer, picked in the admin
              (Casino → Featured special offer). It also appears in the list
              below; promoting it here is the editorial signal the field was
              added for. Renders nothing when no offer is chosen or when the
              chosen one has been switched inactive — the API already filters
              hidden offers out of this relation. */}
          {featuredOffer && (
            <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6" aria-labelledby="featured-offer">
              <h2 id="featured-offer" className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
                {COPY.casinos.featuredOfferHeading}
              </h2>
              <p className="mt-2 font-display text-xl font-bold text-zinc-900">{featuredOffer.title}</p>
              {featuredOffer.bonuses && (
                <p className="mt-1 text-lg font-semibold text-emerald-800">{featuredOffer.bonuses}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {featuredOffer.affiliate_url && (
                  <a
                    href={`/go/${casino.slug}?offer=${featuredOffer.slug}`}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    {COPY.casinos.visitCasino}
                  </a>
                )}
                <Link
                  href={`/special-offers/${featuredOffer.slug}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                >
                  Full terms and details
                </Link>
              </div>

              {/* The wagering requirement and cashout cap belong next to the
                  claim button, not one click away — this is the most prominent
                  place on the site where an offer is presented as claimable. */}
              {featuredOffer.terms && <BonusTerms terms={featuredOffer.terms} />}
            </section>
          )}

          <CasinoSpecialOffers offers={casino.special_offers ?? []} />

          {/* Only linked when the sub-page actually exists — same two
              conditions the route itself enforces, so this never points at a
              404. */}
          {(casino.special_offers?.length ?? 0) >= 2 && (casino.bonuses_intro ?? '').trim() !== '' && (
            <p className="mt-6">
              <Link
                href={`/casinos/${casino.slug}/bonuses`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                {COPY.casinos.bonusesLink}
              </Link>
            </p>
          )}

          {/* Renders nothing when this site has reviews switched off. */}
          <CasinoReviews casinoSlug={casino.slug} casinoName={casino.name} />
          </div>
          </div>
        </div>
      </main>
    </>
  )
}
