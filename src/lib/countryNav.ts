import type { Continent, Country } from '@shared/types/country'

/**
 * What CountryNav reads from a country — and nothing else.
 *
 * CountryNav is a client component, so every field of its props is serialised
 * into the page's RSC payload. Passing the API's continents as they come sent
 * every country row whole (`code`, `position`, `active`, `continent_id`,
 * `created_at`, `updated_at`), countries without a casino included: 21.7 KB of
 * the /casinos payload on winpalack.com for a closed dropdown (SEO audit O9).
 */
export type CountryNavCountry = Pick<Country, 'id' | 'slug' | 'name' | 'image_path'> & { casinos_count: number }

export interface CountryNavContinent {
  id: number
  name: string
  countries: CountryNavCountry[]
}

/**
 * The continents trimmed to CountryNav's shape, server side: only countries
 * with a casino on this site, only continents left with one. CountryNav keeps
 * its own filter as well, so an untrimmed list still renders correctly.
 */
export function countryNavContinents(continents: Continent[]): CountryNavContinent[] {
  return continents
    .map((continent) => ({
      id: continent.id,
      name: continent.name,
      countries: (continent.countries ?? [])
        .filter((c) => (c.casinos_count ?? 0) > 0)
        .map((c) => ({ id: c.id, slug: c.slug, name: c.name, image_path: c.image_path, casinos_count: c.casinos_count ?? 0 })),
    }))
    .filter((continent) => continent.countries.length > 0)
}
