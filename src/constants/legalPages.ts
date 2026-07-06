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
