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
import GaEvents from '@/components/GaEvents'
import Script from 'next/script'
import { Suspense } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/ga'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import SearchOverlay from '@/components/SearchOverlay'
import MobileNav from '@/components/MobileNav'
import HeaderAccount from '@/components/forum/HeaderAccount'
import { getSocialLinks, hasSpecialOffers, getSiteFeatures, getNavigation, getArticles, getNews, getBonusArea, getCategories, getEditorial, getPage } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { NEWSLETTER_ANCHOR, SITE_URL, SUBSCRIBE_ENABLED } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { resolveImageUrl } from '@/lib/images'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
/*
 * `optional`, not the default `swap`, for the display face only. Headings are
 * measured in `ch` (the home h1 is `max-w-[11ch]`), so the swap rewrapped the
 * hero headline from three lines to two and pulled everything under it up
 * ~37px: CLS 0.08 on a mobile home page load (SEO audit O4). With `optional`
 * a font that misses the first ~100ms is skipped for that view and taken from
 * cache on the next one. It is still preloaded, so on most connections it
 * makes the window and nothing changes.
 */
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], style: ['normal', 'italic'], display: 'optional' })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })


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
    images: SHARE_IMAGES,
  },
  // The card TYPE only. A title and description here were inherited by every
  // page that does not set `twitter` itself — nearly all of them — so a shared
  // /casinos or /about went out on X under the HOME page's title. With these
  // tags absent, X reads the page's own og:title, og:description and og:image.
  twitter: { card: 'summary_large_image' },
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
    accounts_enabled: accountsEnabled,
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

  /*
   * Casino categories for the /casinos dropdown.
   *
   * ORDERED BY THE ADMIN, not by this file: the public endpoint applies
   * `Category::scopeOrdered()` — `sort_order` then name — so changing the
   * `sort_order` of a category reorders the menu with no deploy, exactly the
   * way the Bonus dropdown already works.
   *
   * Never fatal and never empty: a failed fetch yields no items and the entry
   * falls back to a plain link to /casinos, rather than a dropdown that opens
   * onto nothing.
   */
  const casinoCategories = await getCategories()
    .then((res) => res.data)
    .catch(() => [])

  /*
   * Menu children for the header dropdown, the footer disclosure and the phone
   * menu: one list each, built once, so the three cannot disagree.
   *
   * Each carries the same icon its chip shows (a casino category's `logo_path`,
   * a bonus type's `icon_path`), resolved HERE on the server so the client menu
   * components never need the storage base URL.
   */
  const bonusMenuItems = bonusSections.map((section) => ({
    slug: section.slug,
    name: section.name,
    icon: resolveImageUrl(section.icon_path),
  }))
  const categoryMenuItems = casinoCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: resolveImageUrl(c.logo_path),
  }))

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
  // Who legally operates the site, from the admin's site settings. Every empty
  // field is null and its line is simply not rendered — in the footer below
  // and in the Organization node alike.
  const { legal } = await getEditorial()
  const footerIdentity = [
    legal.legal_entity_name,
    legal.company_number ? `Company no. ${legal.company_number}` : null,
    // The admin's address first; the one in copy.ts until it is set, so the
    // footer carries an address like every sibling site does.
    legal.registered_address ?? (COPY.footer.postalAddress || null),
  ].filter((part): part is string => part !== null)

  // How We Rate is not one of the seeded pages: linked only once it exists and
  // is published, so the footer never points at a 404 while it is a draft.
  const howWeRate = await getPage('how-we-rate').catch(() => null)
  const legalLinks = [
    ...LEGAL_PAGES.map(({ slug, label }) => ({ slug, label })),
    ...(howWeRate ? [{ slug: 'how-we-rate', label: 'How We Rate' }] : []),
  ]

  const siteGraph = [buildOrganizationSchema(socialLinks, legal), buildWebSiteSchema()]

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased motion-safe:scroll-smooth`}>
      <body className="min-h-full flex flex-col text-slate-900">
        {/* FIRST thing in the body, before anything that could load gtag.js.
            Consent Mode defaults: analytics denied until "Accept All" — see
            ConsentModeScript. */}
        <ConsentModeScript />
        <ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(siteGraph),
          }}
        />
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
          {/* Same 90rem measure as the page sections and the footer, and the
              padding sits OUTSIDE the measure so the logo lines up with the
              content edge below it. A touch taller on desktop to match the
              larger type everywhere else. */}
          <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 max-[374px]:gap-2 lg:h-20">
            <Logo />
            {/* Desktop only. Seven items plus the logo and the icon cluster
                need roughly 810px, so below `lg` (1024px) the bar overflowed
                the viewport on tablets and at 200% zoom and MobileNav takes
                over there. */}
            <nav aria-label="Main navigation" className="hidden min-w-0 lg:block">
              <ul className="flex items-center gap-0.5 xl:gap-1.5" role="list">
                {headerLinks.map(({ href, label, external }) =>
                  /* Special Offers becomes a CHILD of Bonus, so the Bonus parent takes
                     the slot the editor gave Special Offers — replaced in place rather
                     than appended, which would move it to the end of an arranged menu.
                
                     Keyed on the FEATURE SWITCH here, and on CONTENT inside BonusMenu,
                     which renders nothing when no category has a visible offer. Three
                     states, and they are deliberately not the same:

                       feature off              -> the plain link the editor authored
                       feature on, no content   -> nothing at all
                       feature on, content      -> the Bonuses dropdown

                     The middle one is the point: with every offer hidden there is no
                     bonus content to send anyone to, so the entry leaves the menu
                     rather than pointing at an empty listing. Hiding the last visible
                     offer in a category removes that category; hiding the last one
                     anywhere removes Bonuses itself. */
                  href === '/special-offers' && bonusEnabled ? (
                    <BonusMenu
                      key={href}
                      label={COPY.nav.bonus}
                      allLabel={COPY.nav.allOffers}
                      href={href}
                      items={bonusMenuItems}
                    />
                  ) : /* The same dropdown for casino categories. Only when
                        there are any — with none, the entry stays the plain
                        link it was, because a menu that opens onto nothing is
                        worse than no menu. */
                  href === '/casinos' && casinoCategories.length > 0 ? (
                    <BonusMenu
                      key={href}
                      label={label}
                      allLabel={COPY.nav.allCasinos}
                      href={href}
                      itemBasePath="/categories"
                      items={categoryMenuItems}
                    />
                  ) : (
                    <li key={href}>
                      {external || href.startsWith('http') ? (
                        <a
                          href={href}
                          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="group relative flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-medium tracking-tight transition-colors duration-200 xl:px-4 xl:text-[17px] after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:transition-all after:duration-300 after:content-[''] hover:after:w-1/2 text-slate-800 hover:text-emerald-700 after:bg-emerald-600"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link href={href} className="group relative flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-medium tracking-tight transition-colors duration-200 xl:px-4 xl:text-[17px] after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:transition-all after:duration-300 after:content-[''] hover:after:w-1/2 text-slate-800 hover:text-emerald-700 after:bg-emerald-600">
                          {label}
                        </Link>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="flex items-center gap-1 max-[374px]:gap-0">
              {/* Search trigger + overlay. A client island in an otherwise
                  server-rendered header: it renders only a button until opened,
                  so no result markup is shipped and nothing indexed moves
                  client-side. */}
              <SearchOverlay />

              {/* Account control. A client island asking /api/forum/me: reading
                  the session cookie HERE made every page dynamic (SEO audit O1).
                  Gated on the forum switch: accounts exist for the forum, so a
                  control with nowhere to go is worse than no control. */}
              <HeaderAccount enabled={accountsEnabled} />

              {/* The same links as the desktop bar, from the same source — an
                  admin-managed menu must not diverge between breakpoints. */}
              <MobileNav
                links={headerLinks}
                bonusSections={bonusMenuItems}
                casinoCategories={categoryMenuItems}
                casinosAllLabel={COPY.nav.allCasinos}
                bonusLabel={COPY.nav.bonus}
                bonusAllLabel={COPY.nav.allOffers}
                bonusEnabled={bonusEnabled}
              />
            </div>
          </div>
          </div>
        </header>

        {/* Newsletter, directly under the header menu.

            In the page flow, NOT inside the sticky header: it is seen on
            arrival and scrolls away, rather than permanently taking a strip of
            every screen from the content.

            DARK, deliberately: a navy strip between the white header and the
            pale hero is the one band on the page that reads as an action
            rather than more surface, and it frames the hero below it. The
            emerald glow sits behind the envelope icon, so the eye starts at
            the left and reads across to the form. The 90rem measure keeps the
            icon on the logo's edge above.

            The guard wraps the whole band: with capture switched off there is
            no empty strip. `scroll-mt` clears the sticky header, so a jump link
            to #newsletter lands with the heading visible. */}
        {SUBSCRIBE_ENABLED && (
          <section
            id={NEWSLETTER_ANCHOR}
            aria-label={COPY.newsletter.title}
            className="relative isolate scroll-mt-24 overflow-hidden bg-slate-900"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              {/* Emerald glow behind the icon, fading out to the right. */}
              <div className="absolute -left-24 top-1/2 h-64 w-[36rem] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.30),rgba(13,148,136,0.10)_45%,transparent_70%)] blur-2xl" />
              {/* A faint lift along the bottom edge, so the band does not end
                  in a hard dark line against the hero. */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-800/60 to-transparent" />
            </div>
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[90rem] py-3.5 md:py-6">
                <NewsletterForm variant="band" />
              </div>
            </div>
          </section>
        )}

        <div className="flex-1">{children}</div>

        <footer className="mt-auto border-t border-slate-200/70 bg-white/60 backdrop-blur-xl">
          {/* Same 90rem measure as the page sections above it, so the brand
              column and the Explore column sit on the content's own edges. */}
          <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[90rem]">
            {/* The newsletter form moved to the band under the header. */}
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
                    href === '/special-offers' && bonusEnabled ? (
                      <FooterBonusMenu
                        key={href}
                        label={COPY.nav.bonus}
                        allLabel={COPY.nav.allOffers}
                        href={href}
                        items={bonusMenuItems}
                      />
                    ) : href === '/casinos' && casinoCategories.length > 0 ? (
                      <FooterBonusMenu
                        key={href}
                        label={label}
                        allLabel={COPY.nav.allCasinos}
                        href={href}
                        itemBasePath="/categories"
                        items={categoryMenuItems}
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

            {/* Two even columns on a phone, so every link starts on one of two
                shared edges; wrapped as a paragraph, no two rows lined up. */}
            <nav aria-label="Legal" className="mt-10 border-t border-slate-200/70 pt-6">
              <ul className="grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:gap-y-2">
                {legalLinks.map(({ slug, label }) => (
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
                {/* The operator's legal identity, from the admin's site settings
                    (Sites → Edit → Legal identity). It used to be a hardcoded
                    address here; now each part renders only when it is set, and
                    the line disappears entirely while none is — no placeholder
                    is ever printed. On its own line so it stays legible on a
                    phone. `not-italic` is load-bearing: Preflight does not reset
                    the browser's italic default for `address`. */}
                {footerIdentity.length > 0 && (
                  <address className="mt-1 text-xs not-italic text-slate-400">{footerIdentity.join(' · ')}</address>
                )}
              </div>
              {/* The circled 18+ reads as a mark rather than as another line of
                  grey type, with "Gamble responsibly" beside it — the same pair
                  every site's footer carries, each in its own accent. Not
                  `aria-hidden`: the sentence beside it never says the age, so
                  a screen reader needs the "18+" too. */}
              <p className="flex items-center gap-3 text-xs text-slate-400">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-emerald-600 text-emerald-600 text-[13px] font-extrabold">
                  18+
                </span>
                Gamble responsibly
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-400">{COPY.footer.disclaimer}</p>
          </div>
          </div>
        </footer>

        <CookieConsent />
        {SUBSCRIBE_ENABLED && <SubscribeModal />}
        {/* GA4 loads on every page, but under Consent Mode (ConsentModeScript):
            without "Accept All" it sets no cookies and sends only cookieless
            pings. `afterInteractive` keeps it off the critical path. */}
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
        <GaEvents />
        </ToastProvider>
      </body>
    </html>
  )
}
