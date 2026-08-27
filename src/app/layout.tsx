import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import SubscribeModal from '@/components/SubscribeModal'
import ToastProvider from '@/components/ToastProvider'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import ConsentModeScript from '@/components/ConsentModeScript'
import Analytics from '@/components/Analytics'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import { getSocialLinks, hasSpecialOffers } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], style: ['normal', 'italic'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Winpalack'

/**
 * GA4 measurement ID — PRODUCTION ONLY, and only when actually configured.
 *
 * Undefined here means neither the consent bootstrap nor the tag renders at all,
 * so `next dev` and any preview build that simply lacks the variable emit no
 * analytics markup whatsoever — not a disabled tag, nothing.
 *
 * NEXT_PUBLIC_* is inlined by `next build`, so this must be present at BUILD
 * time (a Docker --build-arg). Setting it only in the runtime environment leaves
 * GA silently absent with no error to find.
 */
const GA_ID =
  process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_GA_ID : undefined

// Both strings live in COPY so this site's wording is defined in exactly one
// place — the same place the page-level titles and descriptions come from.
// The previous SITE_DESCRIPTION here was byte-identical to a sibling domain's,
// which made this site's default meta/og/twitter description duplicate content
// on every page that falls back to it.
const SITE_TITLE = `${SITE_NAME} — ${COPY.site.titleTail}`
const SITE_DESCRIPTION = `${SITE_NAME} ${COPY.site.description}`

export const metadata: Metadata = {
  // THE origin every relative canonical and og:url in the app resolves
  // against. `SITE_URL` is validated at module load (see lib/config), so the
  // old `|| 'https://…'` literal is gone: a second hardcoded host here is
  // exactly how the canonical and the sitemap drifted onto different hosts.
  metadataBase: new URL(SITE_URL),
  // Root default. Every page overrides it with its own path, so each URL
  // gets a SELF-referencing canonical rather than inheriting the homepage's.
  alternates: { canonical: '/' },
  title: {
    // Home & inner pages set their own; this is the SEO-friendly fallback title.
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Terms that describe what THIS site publishes. The generic set that was
  // here was shared with a sibling domain and described neither in particular.
  keywords: [...COPY.site.keywords, SITE_NAME],
  // Tab icon.
  //
  // This used to offer ONLY icon.svg. Browsers that do not take an SVG favicon
  // — Safari most visibly — then had nothing to fall back to, because
  // /favicon.ico 404'd, so they showed a placeholder or a stale cached icon
  // instead of this site's own mark. app/favicon.ico now holds 16/32/48 rasters
  // cut from that same artwork, and Next links it automatically from the file
  // convention, so it is deliberately NOT repeated here.
  //
  // `apple` DOES have to be listed: an explicit icons object suppresses the
  // apple-icon file convention, so app/apple-icon.tsx was generating a 180x180
  // PNG at /apple-icon that no page ever linked to.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // Relative on purpose: Next resolves it against metadataBase, so og:url
    // and the canonical can never disagree about the host.
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Search-engine ownership verification, supplied per environment. Absent env
  // vars simply produce no tag, so nothing has to be committed to the repo.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION
        ? { 'p:domain_verify': process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION }
        : {}),
    },
  },
}

/**
 * Viewport + theme colour.
 *
 * Next 14 moved these out of `metadata` into their own export; leaving
 * themeColor in `metadata` is silently ignored, which is why the sites had no
 * theme-color at all. `viewport-fit=cover` is deliberately omitted — nothing
 * here draws into the notch area.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
}

const NAV_LINKS = [
  { href: '/casinos', label: COPY.nav.casinos },
  { href: '/special-offers', label: COPY.nav.specialOffers },
  { href: '/categories', label: COPY.nav.categories },
]

function ShieldMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" aria-hidden>
        {/* Shield + check — matches the header Logo mark */}
        <path d="M12 3l7 3v5.5c0 4.3-2.9 7.2-7 8.5-4.1-1.3-7-4.2-7-8.5V6l7-3z" fill="currentColor" />
        <path d="M8.5 12l2.4 2.4 4.6-5.4" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let socialLinks: SocialLink[] = []
  try {
    socialLinks = (await getSocialLinks()).data
  } catch {
    socialLinks = []
  }

  // "Special Offers" only earns its slot in the nav when this site actually has
  // a visible offer to show; with none, the link would lead to an empty page,
  // so both the header and the footer drop it.
  const showSpecialOffers = await hasSpecialOffers()
  const navLinks = NAV_LINKS.filter(({ href }) => href !== '/special-offers' || showSpecialOffers)

  // Site-wide structured data, rendered once here so every page carries it.
  // Next.js manages the document <head> (manual <head> tags in a root layout are
  // discouraged), so per the framework's JSON-LD guide the <script> is rendered
  // in the layout body — crawlers read JSON-LD from anywhere in the document.
  // The `<` escaping keeps the payload XSS-safe.
  //
  // Two nodes, cross-referenced by @id: the publisher (Organization) and the
  // site (WebSite). socialLinks is already fetched above for the footer, so
  // `sameAs` costs no extra request.
  const siteGraph = [buildOrganizationSchema(socialLinks), buildWebSiteSchema()]

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-900">
        {/* FIRST thing in the body, before anything that could load gtag.js:
            denies every Consent Mode storage type. Rendered only when GA is
            configured, so a build without a measurement ID emits nothing. */}
        {GA_ID && <ConsentModeScript />}
        <ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(siteGraph),
          }}
        />
        <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
            <Logo />
            <nav aria-label="Main navigation" className="no-scrollbar -mr-4 min-w-0 overflow-x-auto pr-4">
              <ul className="flex items-center gap-0.5 sm:gap-1" role="list">
                {navLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="block whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 sm:px-4">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-auto border-t border-slate-200/70 bg-white/60 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 py-12">
            {/* Newsletter — moved from the header strip into the footer */}
            <div className="mb-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm">
              <NewsletterForm />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div>
                <div className="flex items-center gap-3">
                  <ShieldMark />
                  <p className="font-display text-lg font-semibold text-slate-900">{SITE_NAME}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  A curated, independent guide to the finest online casinos and exclusive offers.
                </p>
                {socialLinks.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Follow us</p>
                    <SocialIcons links={socialLinks} />
                  </div>
                )}
              </div>

              <div className="sm:text-right">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Explore</p>
                <ul className="flex flex-col gap-2">
                  {navLinks.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-slate-500 transition-colors hover:text-emerald-700">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <nav aria-label="Legal" className="mt-10 border-t border-slate-200/70 pt-6">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {LEGAL_PAGES.map(({ slug, label }) => (
                  <li key={slug}>
                    <Link href={`/${slug}`} className="text-xs text-slate-400 transition-colors hover:text-emerald-700">{label}</Link>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton />
                </li>
              </ul>
            </nav>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-6 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
                {/* Postal address on its own line under the copyright: it stays
                    legible on a phone, where the two would otherwise wrap into
                    one another. `address` is the correct element semantically;
                    `not-italic` is load-bearing, because Preflight does not
                    reset it and the browser default for the tag is italic. */}
                <address className="mt-1 text-xs not-italic text-slate-400">{COPY.footer.postalAddress}</address>
              </div>
              <p className="text-xs text-slate-400">18+ · Gamble responsibly</p>
            </div>
            <p className="mt-4 text-xs text-slate-400">{COPY.footer.disclaimer}</p>
          </div>
        </footer>

        <CookieConsent />
        <SubscribeModal />
        {GA_ID && <Analytics gaId={GA_ID} />}
        </ToastProvider>
      </body>
    </html>
  )
}
