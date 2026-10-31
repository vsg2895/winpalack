import type { Metadata } from 'next'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/** What a results page shows of a title before cutting it. */
export const TITLE_MAX = 60

/** What a results page shows of a description before cutting it. */
export const DESCRIPTION_MAX = 155

/** Cut at the last whole word that fits, with the ellipsis counted in. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const head = text.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[\s,;:.—–-]+$/, '')
  return `${head || text.slice(0, max - 1)}…`
}

/**
 * Drops a trailing ` | <brand>` (or ` - ` / ` — `) from an admin-written title.
 *
 * Admin titles and SEO patterns often end with the brand already, and the root
 * layout's `title.template` appends it again; this lets the template stay in
 * charge of adding it exactly once. Only an exact tail is removed: a title that
 * mentions the brand mid-sentence is left alone, and a title that is nothing
 * but the brand keeps it.
 */
export function withoutBrandSuffix(title: string): string {
  if (SITE_NAME === '') return title

  const stripped = title.replace(
    new RegExp(`\\s*[|\\-—–]\\s*${SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'),
    '',
  )

  return stripped.trim() === '' ? title : stripped
}

/**
 * A page title that fits in TITLE_MAX characters, brand included when it can.
 *
 * Pass the title WITHOUT the brand. Three outcomes, in order of preference:
 *   - it fits with ` | <brand>` → returned as is, and the layout template adds the brand;
 *   - it fits only on its own   → `absolute`, so the template adds nothing;
 *   - it is too long by itself  → cut at a word boundary, also `absolute`.
 * The page's own words win over the brand: a truncated question is worse than
 * a question without the site name after it.
 *
 * `brand: false` for a title that already names the site somewhere inside it
 * ("About WinPalack"): it is never suffixed again, only fitted.
 */
export function fitTitle(title: string, { brand = true }: { brand?: boolean } = {}): NonNullable<Metadata['title']> {
  const text = title.trim()
  const asRendered = SITE_NAME === '' ? text : `${text} | ${SITE_NAME}`

  if (brand && asRendered.length <= TITLE_MAX) return text
  return { absolute: cutAtWord(text, TITLE_MAX) }
}

/** A meta description cut at a word boundary to DESCRIPTION_MAX characters. */
export function fitDescription(text: string): string
export function fitDescription(text: string | null | undefined): string | undefined
export function fitDescription(text: string | null | undefined): string | undefined {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean === '' ? undefined : cutAtWord(clean, DESCRIPTION_MAX)
}
