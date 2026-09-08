// Countries a casino accepts players from, grouped by continent.
//
// Mirrors CountryResource.php / ContinentResource.php. The attachment is a bare
// pivot with no payload — a casino accepts a country or it does not, and that
// does not vary by site — so there is no `CountryAttachment` type here, unlike
// the casino/site pair.

/** The lightweight continent shape embedded in a country row. */
export interface CountryContinent {
  id: number
  name: string
  slug: string
  position: number
}

export interface Country {
  id: number
  continent_id: number
  /** Present when the API eager-loaded it — the admin list, not the public grid. */
  continent?: CountryContinent
  name: string
  slug: string
  /**
   * ISO 3166-1 alpha-2, or null. Null is normal: the grid also carries entries
   * that are not countries, such as the Europe-wide and "Arab" cards.
   */
  code: string | null
  /** Uploaded flag. Null until one is uploaded; `code` can render one meanwhile. */
  image_path: string | null
  position: number
  active: boolean
  /** Only when the endpoint counted them; scoped to the site on public responses. */
  casinos_count?: number
  created_at: string | null
  updated_at: string | null
}

/** A heading on the countries grid, with its countries when loaded. */
export interface Continent {
  id: number
  name: string
  slug: string
  position: number
  countries?: Country[]
  created_at: string | null
  updated_at: string | null
}

export interface UpsertCountryPayload {
  continent_id: number
  name: string
  code?: string | null
  image_path?: string | null
  position?: number | null
  active?: boolean
}
