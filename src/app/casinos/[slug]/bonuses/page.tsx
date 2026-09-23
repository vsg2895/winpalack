import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCasino } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import BonusTerms from '@/components/BonusTerms'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * Every current offer for one operator.
 *
 * PUBLISHED ONLY WHEN IT EARNS ITS PLACE. Two conditions, both required:
 * at least two live offers, and admin-written intro copy. Without them the page
 * is the casino page's offer list under a different heading — a thin duplicate
 * competing with its own parent for the same query. It 404s instead.
 *
 * That is also why `generateStaticParams` filters: an unqualified casino never
 * gets a prerendered URL, so the route does not advertise pages it will refuse.
 */

/** Minimum live offers before this page is worth having. */
const MIN_OFFERS = 2

type Props = { params: Promise<{ slug: string }> }

function qualifies(offers: unknown[], intro: string | null | undefined): boolean {
  return offers.length >= MIN_OFFERS && (intro ?? '').trim() !== ''
}

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
 * Not hypothetical: that is exactly how /special-offers/[slug] broke on the
 * one site with no visible offers. It was reachable here too, because the
 * params lookup failed CLOSED to an empty list, so one API blip was enough to
 * change the build shape.
 *
 * Removing the function pins the route dynamic whatever the data does.
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const { data: casino } = await getCasino(slug)

    if (!qualifies(casino.special_offers ?? [], casino.bonuses_intro)) {
      return { title: COPY.errors.notFound }
    }

    const title = `${casino.name} ${COPY.casinos.bonusesTitleTail}`
    const description = (casino.bonuses_intro ?? '').slice(0, 155)

    return {
      title,
      description,
      alternates: { canonical: `/casinos/${slug}/bonuses` },
      openGraph: { type: 'article', url: `/casinos/${slug}/bonuses`, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CasinoBonusesPage({ params }: Props) {
  const { slug } = await params

  let casino
  try {
    casino = (await getCasino(slug)).data
  } catch {
    notFound()
  }

  const offers = casino.special_offers ?? []

  // The gate. An operator with one offer, or none written up, has no page here —
  // the casino page already shows what there is.
  if (!qualifies(offers, casino.bonuses_intro)) notFound()

  const pageUrl = `${SITE_URL}/casinos/${slug}/bonuses`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Casinos', url: `${SITE_URL}/casinos` },
      { name: casino.name, url: `${SITE_URL}/casinos/${slug}` },
      { name: 'Bonuses', url: pageUrl },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: `${casino.name} ${COPY.casinos.bonusesTitleTail}`,
      url: pageUrl,
      description: (casino.bonuses_intro ?? '').slice(0, 200),
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: casino.updated_at,
    }),
    breadcrumb,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> /{' '}
            <Link href="/casinos" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Casinos</Link> /{' '}
            <Link href={`/casinos/${slug}`} className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">{casino.name}</Link> /{' '}
            <span className="text-zinc-600">Bonuses</span>
          </nav>

          <h1 className="text-3xl font-bold text-zinc-900">
            {casino.name} {COPY.casinos.bonusesTitleTail}
          </h1>

          <p className="mt-4 text-zinc-700">{casino.bonuses_intro}</p>

          <ul className="mt-8 space-y-6" role="list">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="font-display text-xl font-bold text-zinc-900">{offer.title}</h2>
                {offer.bonuses && (
                  <p className="mt-1 text-lg font-semibold text-emerald-800">{offer.bonuses}</p>
                )}

                {offer.terms && <BonusTerms terms={offer.terms} />}

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {/* No link, no CTA.
                
                      An offer with no affiliate URL is informational — the
                      terms are worth reading, but there is nothing to claim.
                      Showing the button anyway would be worse than useless
                      here: /go falls back to the CASINO's generic link when an
                      offer has none, so the visitor would be sent somewhere
                      that has nothing to do with the bonus they clicked.
                
                      Where a link does exist the CTA goes through /go, so the
                      destination stays admin-editable and the click is
                      counted — same as every other CTA on the site. */}
                  {offer.affiliate_url && (
                    <a
                      href={`/go/${casino.slug}?offer=${offer.slug}`}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      {COPY.specialOffers.claim}
                    </a>
                  )}
                  {/* Promoted to the primary control when it is the only one,
                      so the row does not read as a disabled button. */}
                  <Link
                    href={`/special-offers/${offer.slug}`}
                    className={
                      offer.affiliate_url
                        ? 'inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800'
                        : 'inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100'
                    }
                  >
                    Offer details
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-zinc-500">
            <Link href={`/casinos/${slug}`} className="underline underline-offset-4 hover:text-emerald-700">
              Back to the {casino.name} safety review
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
