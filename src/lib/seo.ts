import type {
  Organization,
  Review,
  BreadcrumbList,
  ItemList,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SocialLink } from '@shared/types/socialLink'
import { SITE_URL } from './config'

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
export function buildOrganizationSchema(socialLinks: SocialLink[] = []): WithContext<Organization> {
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
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
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
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${params.url}#webpage`,
    name: params.name,
    url: params.url,
    ...(params.description ? { description: params.description } : {}),
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    ...(params.breadcrumbId ? { breadcrumb: { '@id': params.breadcrumbId } } : {}),
  }
}

export function buildCasinoReviewSchema(casino: CasinoWithAttachment): WithContext<Review> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: `${casino.name} Review`,
    reviewBody: casino.description ?? undefined,
    itemReviewed: {
      '@type': 'Organization',
      name: casino.name,
      url: casino.attachment.affiliate_url,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: casino.rating,
      bestRating: 5,
      worstRating: 0,
    },
    author: { '@type': 'Organization', name: SITE_NAME },
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
