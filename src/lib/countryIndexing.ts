import type { Country } from '@shared/types/country'

/**
 * The fewest casinos a country page needs before it asks to be indexed.
 *
 * Under it the page is a short list repeated across dozens of countries —
 * thin content, and near-duplicate of its neighbours (SEO audit H7: 65 of 86
 * pages listed one casino). Those pages stay published and linked from the
 * hub; they are only `noindex, follow` and left out of the sitemap. Attaching
 * casinos lifts a page over the line on the next regeneration.
 */
export const COUNTRY_INDEX_MIN_CASINOS = 3

/**
 * Whether a country page may be indexed: enough casinos, and not on this
 * site's "Countries hidden from search" list in the admin (a country where
 * online gambling is prohibited, say).
 *
 * ONE rule for the page's robots tag and the sitemap — a sitemap must never
 * submit a URL whose own page answers `noindex`.
 */
export function isCountryIndexable(country: Pick<Country, 'noindex'>, casinoCount: number): boolean {
  return country.noindex !== true && casinoCount >= COUNTRY_INDEX_MIN_CASINOS
}
