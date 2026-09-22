import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import SubscribeModal from '@/components/SubscribeModal'
import ToastProvider from '@/components/ToastProvider'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import BonusMenu from '@/components/BonusMenu'
import FooterBonusMenu from '@/components/FooterBonusMenu'
import ConsentModeScript from '@/components/ConsentModeScript'
import GaPageView from '@/components/GaPageView'
import Script from 'next/script'
import { Suspense } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/ga'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import SearchOverlay from '@/components/SearchOverlay'
import MobileNav from '@/components/MobileNav'
import HeaderAccount from '@/components/forum/HeaderAccount'
import { getSocialLinks, hasSpecialOffers, getSiteFeatures, getNavigation, getArticles, getNews, getBonusArea } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], style: ['normal', 'italic'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * Subscribe capture is switched OFF site-wide.
 *
 * One constant, gating BOTH entry points this site has: the newsletter form in
 * the footer and the timed subscribe modal. The components, the /api/newsletter
 * route and the backend double-opt-in flow are all untouched and still work;
 * nothing is rendered, so nothing can be submitted.
 *
 * Flip this to `true` to bring the whole thing back. No other edit is needed,
 * which is the point of doing it with a flag rather than by deleting markup.
 */
const SUBSCRIBE_ENABLED = false

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Winpalack'


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
  { href: '/countries', label: COPY.nav.countries },
  { href: '/reviews', label: COPY.nav.forum },
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

  // "Countries" is a per-site feature switch rather than a content check: the
  // page 404s when it is off, so linking to it would advertise a dead route.
  const {
    countries_enabled: showCountries,
    guides_enabled: guidesEnabled,
    news_enabled: newsEnabled,
    bonus_enabled: bonusEnabled,
    // Set by the admin's Forum page screen, already ANDed with reviews_enabled
    // server-side, so the link cannot advertise a page that 404s.
    forum_enabled: showForum,
    // The DISCUSSION BOARD, not the reviews feed above — two different flags.
    community_forum_enabled: forumEnabled,
  } = await getSiteFeatures()

  // The guides link appears only once the section is actually open. Same
  // three-article threshold the /guides route itself enforces, so the nav can
  // never point at a 404 — and a section with one post never advertises itself.
  const showGuides = guidesEnabled && (await getArticles()).length >= 3

  // News has no minimum — one post is a new feed, not an abandoned section — so
  // the link appears as soon as there is something behind it. Still gated on
  // something existing: a menu item leading to a 404 is worse than no item.
  const showNews = newsEnabled && (await getNews()).length > 0

  // The Bonus area drives BOTH the header dropdown and the home-page sections
  // from one payload, so the menu can never point at a section that is not
  // rendered. Categories with no visible offer are dropped server-side.
  const bonusSections = bonusEnabled ? await getBonusArea() : []

  // Admin-managed menus, or null when this site has none configured.
  const navigation = await getNavigation()

  // The built-in menu, filtered by the feature switches. Still the fallback, and
  // still what every site that has not adopted admin navigation renders.
  const codeNavLinks = [
    ...NAV_LINKS,
    // Appended rather than declared in NAV_LINKS: it is conditional on content
    // volume, not just a feature switch.
    ...(showNews ? [{ href: '/news', label: COPY.nav.news }] : []),
    ...(showGuides ? [{ href: '/guides', label: COPY.nav.guides }] : []),
  ].filter(({ href }) => {
    if (href === '/special-offers') return showSpecialOffers
    if (href === '/countries') return showCountries
    // Unlike Special Offers, this is NOT gated on having content. An empty
    // forum has a real empty state that asks for the first review, so the link
    // is how that review gets written — dropping it would be the deadlock.
    if (href === '/reviews') return showForum
    return true
  })

  // An admin-managed menu is taken AS AUTHORED — no feature filtering. If an
  // editor put a link in the menu, they meant it; silently dropping it because
  // of a switch they also control would be the panel arguing with itself. The
  // filtering above exists only for links this site never chose.
  const headerLinks = navigation?.header.length
    ? navigation.header.map((i) => ({ href: i.url, label: i.label, external: i.opens_in_new_tab }))
    : codeNavLinks.map((l) => ({ ...l, external: false }))

  const footerLinks = navigation?.footer.length
    ? navigation.footer.map((i) => ({ href: i.url, label: i.label, external: i.opens_in_new_tab }))
    : codeNavLinks.map((l) => ({ ...l, external: false }))

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
        {/* FIRST thing in the body, before anything that could load gtag.js.
            Grants every Consent Mode storage type — see ConsentModeScript. */}
        <ConsentModeScript />
        <ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(siteGraph),
          }}
        />
        <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          {/* Same 90rem measure as the page sections and the footer, and the
              padding sits OUTSIDE the measure so the logo lines up with the
              content edge below it. A touch taller on desktop to match the
              larger type everywhere else. */}
          <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 lg:h-[4.5rem]">
            <Logo />
            {/* Desktop only. Seven items plus the logo and the icon cluster
                need roughly 810px, so below `lg` (1024px) the bar overflowed
                the viewport on tablets and at 200% zoom and MobileNav takes
                over there. */}
            <nav aria-label="Main navigation" className="hidden min-w-0 lg:block">
              <ul className="flex items-center gap-1" role="list">
                {headerLinks.map(({ href, label, external }) =>
                  /* Special Offers becomes a CHILD of Bonus, so the Bonus parent takes
                     the slot the editor gave Special Offers — replaced in place rather
                     than appended, which would move it to the end of an arranged menu. */
                  href === '/special-offers' && bonusSections.length > 0 ? (
                    <BonusMenu
                      key={href}
                      label={COPY.nav.bonus}
                      allLabel={COPY.nav.allOffers}
                      href={href}
                      items={bonusSections.map((section) => ({ slug: section.slug, name: section.name }))}
                    />
                  ) : (
                    <li key={href}>
                      {external || href.startsWith('http') ? (
                        <a
                          href={href}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="group relative flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold tracking-tight transition-all duration-200 xl:px-4 xl:text-base after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:transition-all after:duration-300 after:content-[''] hover:after:w-1/2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 after:bg-emerald-600"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link href={href} className="group relative flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold tracking-tight transition-all duration-200 xl:px-4 xl:text-base after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:transition-all after:duration-300 after:content-[''] hover:after:w-1/2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 after:bg-emerald-600">
                          {label}
                        </Link>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="flex items-center gap-1">
              {/* Search trigger + overlay. A client island in an otherwise
                  server-rendered header: it renders only a button until opened,
                  so no result markup is shipped and nothing indexed moves
                  client-side. */}
              <SearchOverlay />

              {/* Account control. A Server Component reading the session cookie,
                  so the header shows the right state on first paint instead of
                  flashing "Sign in" at every signed-in member. Gated on the
                  forum switch: accounts exist for the forum, so a control with
                  nowhere to go is worse than no control. */}
              <HeaderAccount enabled={forumEnabled} />

              {/* The same links as the desktop bar, from the same source — an
                  admin-managed menu must not diverge between breakpoints. */}
              <MobileNav
                links={headerLinks}
                bonusSections={bonusSections.map((section) => ({ slug: section.slug, name: section.name }))}
                bonusLabel={COPY.nav.bonus}
              />
            </div>
          </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-auto border-t border-slate-200/70 bg-white/60 backdrop-blur-xl">
          {/* Same 90rem measure as the page sections above it, so the brand
              column and the Explore column sit on the content's own edges. */}
          <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[90rem]">
            {/* Newsletter — hidden while SUBSCRIBE_ENABLED is false. The card
                wrapper is INSIDE the guard on purpose: left outside, it would
                render as an empty bordered box at the top of the footer. */}
            {SUBSCRIBE_ENABLED && (
              <div className="mb-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm">
                <NewsletterForm />
              </div>
            )}

            {/* Two columns pushed to opposite edges (space-between), not a
                2-col grid: the grid put "Explore" at the exact centre of the
                footer with dead space to its right. The brand column keeps a
                reading width; the link column hugs the right edge while its
                own labels stay left-aligned inside it. */}
            <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
              <div className="max-w-md">
                <div className="flex items-center gap-3">
                  <ShieldMark />
                  <p className="font-display text-lg font-semibold text-slate-900 lg:text-2xl">{SITE_NAME}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">
                  A curated, independent guide to the finest online casinos and exclusive offers.
                </p>
                {socialLinks.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500 lg:text-sm">Follow us</p>
                    <SocialIcons links={socialLinks} />
                  </div>
                )}
              </div>

              {/* LEFT-aligned, not `sm:text-right`.

                  Right-aligning made every label start at a different x, so the
                  column read as ragged — and the Bonus group's expanded children
                  had no shared edge to line up against. A single left edge is
                  what makes a vertical list scannable. */}
              <div className="sm:shrink-0">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500 lg:text-sm">Explore</p>
                <ul className="flex flex-col gap-2 lg:gap-3">
                  {footerLinks.map(({ href, label, external }) =>
                    /* Special Offers is a CHILD of Bonus, so the Bonus group takes
                       the slot it held. Unlike the header's floating dropdown this one
                       expands IN FLOW — the links beneath it move down. A footer has
                       room to grow and nothing below to obscure, whereas a panel
                       floating upward would cover the list the reader is using. */
                    href === '/special-offers' && bonusSections.length > 0 ? (
                      <FooterBonusMenu
                        key={href}
                        label={COPY.nav.bonus}
                        allLabel={COPY.nav.allOffers}
                        href={href}
                        items={bonusSections.map((section) => ({ slug: section.slug, name: section.name }))}
                      />
                    ) : (
                      <li key={href}>
                        {external || href.startsWith('http') ? (
                          <a
                            href={href}
                            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700 lg:text-base"
                          >
                            {label}
                          </a>
                        ) : (
                          <Link href={href} className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700 lg:text-base">{label}</Link>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            <nav aria-label="Legal" className="mt-10 border-t border-slate-200/70 pt-6">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {LEGAL_PAGES.map(({ slug, label }) => (
                  <li key={slug}>
                    <Link href={`/${slug}`} className="inline-block -mx-1 px-1 py-3 -my-3 text-xs text-slate-400 transition-colors hover:text-emerald-700 lg:text-sm">{label}</Link>
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
          </div>
        </footer>

        <CookieConsent />
        {SUBSCRIBE_ENABLED && <SubscribeModal />}
        {/* GA4 — unconditional. No consent gate, no environment gate, no
            interaction gate: these load on every page for every visitor.
            `afterInteractive` keeps them off the critical path, so nothing here
            blocks rendering. */}
        <Script
          id="ga-loader"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script id="ga-config" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){ dataLayer.push(arguments); }
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* Suspense is required: GaPageView calls useSearchParams(), which would
            otherwise opt this whole tree into dynamic rendering and lose static
            generation across the site. */}
        <Suspense fallback={null}>
          <GaPageView />
        </Suspense>
        </ToastProvider>
      </body>
    </html>
  )
}
