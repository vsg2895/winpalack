import type {
  Organization,
  Review,
  BreadcrumbList,
  ItemList,
  WebPage,
  WebSite,
  Person,
  WithContext, FAQPage } from 'schema-dts'
import type { Author, BylinePerson } from '@shared/types/author'
import type { SiteLegalIdentity } from '@shared/types/editorial'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SocialLink } from '@shared/types/socialLink'
import { SITE_URL } from '../config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  `${SITE_NAME} lists an online casino only after checking its licence, withdrawal limits and safer-play tools.`

/**
 * Stable @id for the publisher node.
 *
 * Every schema block that needs to name the publisher references this instead of
 * repeating the Organization inline. One canonical node per entity is what lets
 * Google merge the graph rather than reading each page as a separate publisher.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`

/**
 * The publisher node, emitted once site-wide from the root layout.
 *
 * `sameAs` is populated from the site's configured social profiles — the same
 * links already rendered in the footer — which is how a search engine connects
 * this domain to those accounts and consolidates entity signals.
 *
 * No `logo` yet, deliberately: Google only accepts .jpg/.png/.gif for an
 * Organization logo, and these sites currently ship an SVG mark. Adding it would
 * fail Rich Results validation rather than help. It goes in with the raster
 * icon set.
 */
export function buildOrganizationSchema(
  socialLinks: SocialLink[] = [],
  /**
   * Who legally operates the site, from the admin's site settings. Each field
   * is emitted only when set: markup naming an entity or address the site
   * does not publish would be a claim nobody can verify.
   */
  legal: SiteLegalIdentity | null = null,
): WithContext<Organization> {
  const profiles = socialLinks
    .map((link) => link.url)
    .filter((url): url is string => typeof url === 'string' && url.trim() !== '')

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    ...(legal?.legal_entity_name ? { legalName: legal.legal_entity_name } : {}),
    ...(legal?.registered_address ? { address: legal.registered_address } : {}),
    ...(legal?.contact_email ? { email: legal.contact_email } : {}),
    ...(legal?.company_number ? { identifier: legal.company_number } : {}),
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
  }
}

/** Stable @id of an author's Person node — the same on bylines and on the author page. */
export function personIdFor(slug: string): string {
  return `${SITE_URL}/authors/${slug}#person`
}

/** A byline's person as a compact Person reference, linked to their page. */
export function bylinePersonSchema(person: BylinePerson): Person {
  return {
    '@type': 'Person',
    '@id': personIdFor(person.slug),
    name: person.name,
    url: `${SITE_URL}/authors/${person.slug}`,
    ...(person.role ? { jobTitle: person.role } : {}),
  }
}

/** The full Person node for /authors/{slug}. */
export function buildPersonSchema(author: Author, imageUrl: string | null): WithContext<Person> {
  const sameAs = author.profile_links.map((l) => l.url).filter((u) => u.trim() !== '')

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personIdFor(author.slug),
    name: author.name,
    url: `${SITE_URL}/authors/${author.slug}`,
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.short_bio ? { description: author.short_bio } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(author.expertise.length > 0 ? { knowsAbout: author.expertise } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    worksFor: { '@id': ORGANIZATION_ID },
  }
}

/**
 * The WebSite node, emitted once site-wide alongside the Organization.
 *
 * NOTE — no `potentialAction`/SearchAction. Google's sitelinks-searchbox markup
 * requires a search endpoint that actually resolves; none of these sites has
 * one, and declaring a target that 404s fails validation. It belongs here the
 * day a /search route exists, and not before.
 */
export function buildWebSiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': ORGANIZATION_ID },
  }
}

/**
 * A per-page WebPage node tying the page to the site graph.
 *
 * Pass the breadcrumb's @id when the page renders one, so the two are linked
 * instead of floating as unrelated blocks.
 */
export function buildWebPageSchema(params: {
  name: string
  url: string
  description?: string
  breadcrumbId?: string
  /** ISO-8601. Freshness is a strong citation signal for answer engines. */
  dateModified?: string
  /**
   * A WebPage subtype, when the page IS one. AboutPage and ContactPage are the
   * types schema.org defines for a site's who-we-are and how-to-reach-us pages —
   * the trust pages a reader (and a quality rater) looks for on an affiliate.
   */
  type?: 'WebPage' | 'AboutPage' | 'ContactPage'
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': params.type ?? 'WebPage',
    '@id': `${params.url}#webpage`,
    name: params.name,
    url: params.url,
    ...(params.description ? { description: params.description } : {}),
    inLanguage: 'en',
    ...(params.dateModified ? { dateModified: params.dateModified } : {}),
    isPartOf: { '@id': WEBSITE_ID },
    ...(params.breadcrumbId ? { breadcrumb: { '@id': params.breadcrumbId } } : {}),
  }
}

export function buildCasinoReviewSchema(
  casino: CasinoWithAttachment,
  /**
   * The named reviewer, when this site has one configured. OMITTED entirely
   * when absent — an `author` node naming the organisation instead of a person
   * would assert human authorship we cannot point at, which is precisely the
   * claim structured data is scrutinised for.
   */
  author?: { name: string } | null,
): WithContext<Review> {
  /*
   * A rating ONLY when the editor set one. `rating` is an integer with 0 as its
   * default, so 0 means "not scored yet" — and markup claiming a 0/5 verdict
   * for every unscored casino is the fabricated data Google's review-snippet
   * policy names. Without it the Review stays valid; it just earns no stars.
   */
  const hasRating = casino.rating > 0

  // This site's own byline wins: it names a person with a page of their own.
  // The site-wide editorial author is the fallback for casinos without one.
  const person = casino.byline?.author ?? casino.byline?.reviewer ?? null
  const reviewDate = casino.byline?.last_reviewed_at ?? casino.reviewed_at ?? null

  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: `${casino.name} Review`,
    // Only emitted alongside a real review date, matching the visible byline —
    // the markup and the page must make the same claim.
    ...(person
      ? {
          author: bylinePersonSchema(person),
          ...(reviewDate ? { datePublished: reviewDate } : {}),
        }
      : author && casino.reviewed_at
        ? {
            author: { '@type': 'Person' as const, name: author.name },
            datePublished: casino.reviewed_at,
          }
        : {}),
    // When the editorial verdict was last revised. Answer engines weight recency
    // heavily when choosing which source to quote.
    ...(casino.updated_at ? { dateModified: casino.updated_at } : {}),
    reviewBody: casino.description ?? undefined,
    itemReviewed: {
      '@type': 'Organization',
      name: casino.name,
      url: casino.attachment.affiliate_url,
      // ratingCount is 1 because this IS one editorial score — the same value the
      // Review carries. Inflating it to imply crowd-sourced ratings we do not have
      // would be structured-data spam and risks a manual action.
      ...(hasRating
        ? {
            aggregateRating: {
              '@type': 'AggregateRating' as const,
              ratingValue: casino.rating,
              bestRating: 5,
              worstRating: 0,
              ratingCount: 1,
            },
          }
        : {}),
    },
    ...(hasRating
      ? {
          reviewRating: {
            '@type': 'Rating' as const,
            ratingValue: casino.rating,
            bestRating: 5,
            worstRating: 0,
          },
        }
      : {}),
    // The site as author, used ONLY when no named reviewer is configured.
    // Declared after the spread above, so without this guard it silently
    // overwrote the Person node and the markup credited the brand while the
    // visible byline credited a person — two different claims on one page.
    ...(author && casino.reviewed_at
      ? {}
      : { author: { '@type': 'Organization' as const, name: SITE_NAME } }),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

export function buildItemListSchema(
  name: string,
  url: string,
  items: Array<{ position: number; name: string; url: string }>,
): WithContext<ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url,
    })),
  }
}

/** Stable @id for a page's breadcrumb node, so WebPage can reference it. */
export function breadcrumbIdFor(pageUrl: string): string {
  return `${pageUrl}#breadcrumb`
}

export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; url: string }>,
  pageUrl?: string,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    // Given a page URL the node becomes addressable, which is what lets the
    // page's WebPage node point at it instead of the two sitting side by side
    // as unrelated blocks.
    ...(pageUrl ? { '@id': breadcrumbIdFor(pageUrl) } : {}),
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

/**
 * Serialise schema nodes as ONE JSON-LD document, in the canonical `@graph` form.
 *
 * Why not just JSON.stringify an array of nodes (what this used to do): a
 * top-level array has no `@context` of its own, so any consumer that reads
 * `parsed["@context"]` — schema validators, SEO browser extensions, some
 * crawlers — gets `undefined` and throws. That surfaced as a real runtime error
 * in the browser: `undefined is not an object (evaluating 'r["@context"].toLowerCase')`.
 *
 * `{ "@context": ..., "@graph": [...] }` is the documented way to put several
 * linked entities in one script tag: the context is declared once at the top and
 * each node keeps its `@id`, so the entity graph is unchanged for Google while
 * naive consumers stop breaking.
 *
 * Also escapes `<` so a stray "</script>" inside any string can never break out
 * of the tag — previously done in the layout but not on the page emitters.
 */
export function jsonLdScript(nodes: unknown): string {
  const list = (Array.isArray(nodes) ? nodes : [nodes]).filter(
    (node): node is Record<string, unknown> => typeof node === 'object' && node !== null,
  )

  const graph = list.map((node) => {
    // `@context` belongs on the document, not on each node inside `@graph`.
    const copy: Record<string, unknown> = { ...node }
    delete copy['@context']
    return copy
  })

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

/**
 * FAQPage — the highest-leverage schema for answer engines, which lift explicit
 * question/answer pairs far more readily than prose.
 *
 * Google requires the same Q&A to be VISIBLE on the page; emitting it in markup
 * only is a guidelines violation. The caller therefore renders `FAQ_ITEMS` and
 * passes the same array here, so the two can never drift apart.
 */
export function buildFaqSchema(
  url: string,
  items: ReadonlyArray<{ question: string; answer: string }>,
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

/**
 * The site's share card — app/opengraph-image.tsx — as `openGraph.images`.
 *
 * Next merges metadata SHALLOWLY: a page that sets `openGraph` replaces the
 * layout's whole object, and the generated card went with it. Only the home
 * page (the card's own segment) was shared with an image; every other page
 * went out as a large-image card with nothing in it. So every `openGraph`
 * restates this, unless the page has a truthful image of its own.
 *
 * The alt lives here, not in opengraph-image.tsx, which imports it: importing
 * that file instead would pull next/og into every page's metadata.
 */
export const SHARE_IMAGE_ALT = 'Winpalack — Responsible Casino Guide'
export const SHARE_IMAGES = [{ url: '/opengraph-image', width: 1200, height: 630, alt: SHARE_IMAGE_ALT }]
