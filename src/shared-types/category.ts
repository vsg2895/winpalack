// Fields match CategoryResource.php.
export interface Category {
  id: number
  name: string
  slug: string
  /**
   * Stored path to the category's SVG logo, or null.
   *
   * A PATH, not a URL — resolve it with `resolveImageUrl()` the same way casino
   * images are resolved. Always an SVG: uploads are sanitised and stored as
   * `.svg`, which is what lets one asset serve both the nav chip and the card.
   */
  logo_path: string | null
  sort_order?: number
  casinos_count?: number
  created_at: string
  updated_at: string
}
