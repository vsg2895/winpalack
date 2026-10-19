import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffer } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import BonusTerms from '@/components/BonusTerms'
import { CLAIMABLE_BONUS_CATEGORY } from '@/components/SpecialOfferCard'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

/*
 * NO generateStaticParams, deliberately — this route renders on demand.
 *
 * Next classifies a dynamic route from what that function RETURNS: a non-empty
 * list builds `f` (dynamic), an EMPTY list builds a fully static route. A
 * static render then throws DYNAMIC_SERVER_USAGE, because the root layout
 * reads the session cookie for the header's account control and a static
 * render may not touch cookies — taking the whole route down with a 500 for
 * every slug, valid or not.
 *
 * Not hypothetical: that is exactly how this route broke in production on the
 * one site with no visible offers.
 *
 * `force-dynamic` was tried and is NOT the fix — measured: with the function
 * still present and returning [], the build kept marking the route static.
 * Removing the function is what pins it, and it avoids force-dynamic's side
 * effect of downgrading fetchCache to no-store, which would send every request
 * straight to the API.
 */

/**
 * An admin-authored SEO title, with a brand suffix it already carries removed.
 *
 * The root layout sets `title.template = '%s | <brand>'`. That is right for a
 * composed default, but an SEO title written in the admin is a finished string,
 * and operators naturally end one with the brand — so every offer page with a
 * pattern applied rendered "… — Terms Stated Up Front | Winpalack | Winpalack":
 * the brand twice, and the words that matter pushed past the ~60 characters
 * Google renders.
 *
 * Stripping the suffix rather than switching to `title: { absolute }` is
 * deliberate. `absolute` bypasses the template entirely, which also means a
 * perfectly good admin title that does NOT mention the brand loses it — the
 * duplication would be gone and the branding with it. This way the template
 * stays in charge of appending the brand exactly once, whichever way the title
 * was written.
 *
 * Only an exact ` | <brand>` / ` - <brand>` / ` — <brand>` tail is removed, and
 * only from the end: a title that mentions the brand mid-sentence is left alone.
 */
function withoutBrandSuffix(title: string): string {
  if (SITE_NAME === '') return title

  const stripped = title.replace(
    new RegExp(`\\s*[|\\-—–]\\s*${SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'),
    '',
  )

  // Never return an empty title — a record whose SEO title is nothing but the
  // brand keeps it, and the template's duplicate is the lesser problem.
  return stripped.trim() === '' ? title : stripped
}

/**
 * The offer's own prose, as plain text — the only field on an offer that is
 * written per offer AND per nothing else.
 *
 * Measured on live data before this existed: 18 of 29 offers carry no
 * `bonuses` value, and `bonuses` is a column on the global `special_offers`
 * row — identical across all eight domains, with only 8 distinct values across
 * 29 offers. Composed from it, every thin offer's meta description came out as
 * its title plus one sentence repeated on every sibling page. `description` is
 * where an editor actually writes, so it goes first.
 */
function plainDescription(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trimmed at a word boundary to the ~155 characters Google renders. */
function metaLength(text: string): string {
  return text.length <= 155 ? text : `${text.slice(0, 155).replace(/\s+\S*$/, '')}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: offer } = await getSpecialOffer(slug)
    const title = offer.title
    /*
     * The written description first; the `bonuses` composition only as a
     * fallback for an offer nobody has written up yet — which is a content gap
     * this file cannot close, not something to paper over with a longer
     * boilerplate sentence. See plainDescription() above for the measurements.
     */
    const prose = plainDescription(offer.description)
    const description = prose !== ''
      ? metaLength(prose)
      : offer.bonuses
        ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
        : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    // Admin-resolved SEO. Null unless a site pattern or a per-record override
    // exists, so the composed wording above remains the default.
    const seo = offer.seo
    const finalTitle = seo?.title ? withoutBrandSuffix(seo.title) : title
    /*
     * PRECEDENCE, and the reason it is not simply `seo?.description ?? …`:
     *
     *   1. a per-record override someone typed for THIS offer;
     *   2. the offer's own written prose;
     *   3. the site's SEO pattern;
     *   4. the composed `bonuses` line.
     *
     * The pattern used to sit at (1) because the API hands back a finished
     * string either way. It renders one sentence with the title substituted in,
     * so all 29 offers carried "Wagering, minimum deposit and withdrawal caps
     * for <title>, written out before you claim." — differing only by a few
     * words of title, on pages that are already thin. `description_from_record`
     * is what lets a real override keep winning while the pattern drops below
     * the prose.
     */
    const finalDescription = seo?.description_from_record === true && seo.description
      ? seo.description
      : prose !== ''
        ? description
        : (seo?.description ?? description)

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
      /*
       * INDEXABILITY, in two distinct gates.
       *
       * `!active` is the hard one: the offer is withdrawn, the page exists only
       * so an old link does not 404, and `follow: false` keeps it from passing
       * anything onward.
       *
       * `is_indexable` is the editorial one, computed on the server from this
       * offer alone (SpecialOffer::isIndexable): at least ~80 words of
       * description OR filled bonus terms, and no explicit admin noindex. It
       * exists because the median offer description was 33 words and Search
       * Console reported those pages as "Crawled — currently not indexed" —
       * Google's verdict was right, and asking it again on every crawl spends
       * budget the finished offers need. `follow` stays true: the casino and
       * category links on a thin page are still worth following.
       *
       * The same flag filters the sitemap, so the two can never disagree.
       */
      ...(!offer.active
        ? { robots: { index: false, follow: false } }
        : offer.is_indexable === false
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
  // The same rule the cards use: Claim is a property of the bonus TYPE.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY
  const pageUrl = `${SITE_URL}/special-offers/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Special Offers', url: `${SITE_URL}/special-offers` },
      { name: offer.title, url: pageUrl },
    ],
    pageUrl,
  )
  /*
   * `Offer`, and deliberately NOT `SpecialAnnouncement`.
   *
   * SpecialAnnouncement is scoped to public-health and emergency notices;
   * applying it to a casino bonus is schema misuse that risks a manual action
   * rather than a rich result. `Offer` is the type that describes a promotion.
   *
   * ONLY FIELDS WE ACTUALLY HOLD. No `price`, no `priceCurrency`, no
   * `availabilityEnds` — this API exposes none of them, and an Offer carrying
   * an invented figure is worse than no Offer at all. Every optional key is
   * omitted rather than emitted empty, for the same reason the casino Review
   * schema omits an author it cannot name.
   */
  const offerProse = plainDescription(offer.description)
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: offer.title,
    url: pageUrl,
    /*
     * One description, from whichever field has something to say. `bonuses` is
     * NOT given a property of its own: it reads like "100% up to €500", and the
     * Offer properties that take a figure (`price`, `eligibleTransactionVolume`)
     * expect a number or a PriceSpecification, not a human sentence. Forcing it
     * into one would be the same misuse this block avoided by not reaching for
     * SpecialAnnouncement.
     */
    ...(offerProse !== ''
      ? { description: offerProse }
      : offer.bonuses
        ? { description: offer.bonuses }
        : {}),
    ...(offer.casino?.name
      ? { offeredBy: { '@type': 'Organization', name: offer.casino.name } }
      : {}),
    ...(offer.bonus_category_name ? { category: offer.bonus_category_name } : {}),
  }

  const graph = [
    buildWebPageSchema({
      name: offer.title,
      url: pageUrl,
      // The prose, same as the meta description, rather than the shared
      // `bonuses` line that is identical across the network.
      description: offerProse !== '' ? offerProse : (offer.bonuses ?? undefined),
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: offer.updated_at,
    }),
    breadcrumb,
    offerSchema,
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

          {/* The artwork alone — NO shared backdrop here, deliberately.
              The backdrop exists to make a GRID of bonus cards read as one set;
              this page shows a single bonus at full width, where there is no set
              to belong to and the gold ground would only compete with the
              artwork it sits behind. `object-contain` stays: nothing is cropped
              off the edges of a banner meant to be read whole. */}
          {banner && (
            <div className="relative mb-6 aspect-[16/6] overflow-hidden rounded-2xl bg-zinc-100">
              <Image
                src={banner}
                alt={offer.title}
                fill
                sizes="(max-width: 1024px) 100vw, 1440px"
                priority
                className="object-contain object-center"
              />
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
            // Claim belongs to the Special Offers bonus type, matching the
            // cards — see CLAIMABLE_BONUS_CATEGORY in SpecialOfferCard. A
            // bonus of another type still shows its terms and its operator
            // link in the rail below; what it does not show is a Claim button,
            // which on this site means "this is a Special Offer".
            //
            // Still requires a link HERE, unlike the card: the card's Claim
            // falls back to this page, and a button on this page leading to
            // this page would lead nowhere. The operator link in the rail is
            // the route onward when the offer carries no URL of its own.
            claimable && offer.affiliate_url && (
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
