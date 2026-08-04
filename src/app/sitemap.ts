import type { MetadataRoute } from 'next'
import { getCasinos, getCategories, getSpecialOffers } from '@/lib/api'
import { LEGAL_PAGES } from '@/constants/legalPages'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

// Guard against missing/invalid timestamps so the sitemap never fails to render.
function safeDate(value: string | null | undefined): Date {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [casinosRes, categoriesRes, offersRes] = await Promise.allSettled([
    getCasinos(),
    getCategories(),
    getSpecialOffers(),
  ])

  const casinoUrls: MetadataRoute.Sitemap =
    casinosRes.status === 'fulfilled'
      ? casinosRes.value.data.map((c) => ({
          url: `${BASE_URL}/casinos/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
      : []

  const categoryUrls: MetadataRoute.Sitemap =
    categoriesRes.status === 'fulfilled'
      ? categoriesRes.value.data.map((c) => ({
          url: `${BASE_URL}/categories/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        }))
      : []

  const offerUrls: MetadataRoute.Sitemap =
    offersRes.status === 'fulfilled'
      ? offersRes.value.data.map((o) => ({
          url: `${BASE_URL}/special-offers/${o.slug}`,
          lastModified: safeDate(o.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        }))
      : []

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/casinos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/special-offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  // The legal / informational pages are linked from every footer but were absent
  // from the sitemap, leaving 11 indexable URLs per site discoverable only by
  // crawling. They change rarely, so a low priority and a monthly frequency.
  const legalUrls: MetadataRoute.Sitemap = LEGAL_PAGES.map(({ slug }) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  }))

  return [...staticUrls, ...casinoUrls, ...categoryUrls, ...offerUrls, ...legalUrls]
}
