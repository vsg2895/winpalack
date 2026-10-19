// The standard legal / informational pages exposed on every site.
// Slugs must match the per-site cms_pages slugs seeded in the backend
// (see App\Support\LegalPageContent).
export const LEGAL_PAGES = [
  { slug: 'about', label: 'About' },
  { slug: 'contact', label: 'Contact' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'terms', label: 'Terms' },
  { slug: 'cookie-policy', label: 'Cookie Policy' },
  { slug: 'responsible-gambling', label: 'Responsible Gambling' },
  { slug: 'affiliate-disclosure', label: 'Affiliate Disclosure' },
  { slug: 'disclaimer', label: 'Disclaimer' },
  { slug: 'aml-policy', label: 'AML Policy' },
  { slug: 'kyc-policy', label: 'KYC Policy' },
  { slug: 'editorial-policy', label: 'Editorial Policy' },
] as const

export type LegalPageSlug = (typeof LEGAL_PAGES)[number]['slug']

/**
 * The subset of the eleven that is INDEXABLE by default — the pages that answer
 * "who runs this site and how is it funded".
 *
 * `LEGAL_PAGES` above stays the full set: the footer links all eleven and
 * `generateStaticParams` pre-renders all eleven. This list exists only so the
 * sitemap knows which ones are worth ASKING about — it then submits a page only
 * when the API says that page is actually indexable on this site, so flipping
 * `noindex` on in the admin removes it from the sitemap with no deploy.
 *
 * The other six — privacy policy, terms, cookie policy, disclaimer, AML, KYC —
 * are generated from one template for every site in the network and ship
 * `noindex`, so they are never submitted.
 */
export const TRUST_PAGE_SLUGS = [
  'about',
  'contact',
  'responsible-gambling',
  'affiliate-disclosure',
  'editorial-policy',
] as const
