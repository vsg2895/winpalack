import type {
  Organization,
  Review,
  BreadcrumbList,
  ItemList,
  WithContext,
} from 'schema-dts'
import type { CasinoWithAttachment } from '@shared/types/casino'
import { SITE_URL } from './config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export function buildOrganizationSchema(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
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

export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; url: string }>,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}
