import type { Metadata } from 'next'
import { Fraunces, Inter, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import { getSocialLinks } from '@/lib/api'
import { buildOrganizationSchema } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], style: ['normal', 'italic'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Winpalack'

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: `Expert casino reviews, special offers and guides at ${SITE_NAME}.`,
  metadataBase: new URL(SITE_URL || 'http://localhost:3000'),
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

  // Site-wide Organization structured data. Rendered once here in the root
  // layout so every page carries it. Next.js manages the document <head> (manual
  // <head> tags in a root layout are discouraged), so per the framework's JSON-LD
  // guide the <script> is rendered in the layout body — crawlers read JSON-LD
  // from anywhere in the document. The `<` escaping keeps the payload XSS-safe.
  const organizationSchema = buildOrganizationSchema()

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
          }}
        />
        <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
            <Logo />
            <nav aria-label="Main navigation">
              <ul className="flex items-center gap-1" role="list">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        {/* Newsletter strip — directly under the header */}
        <section className="border-b border-slate-200/70 bg-white/50 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 py-5">
            <NewsletterForm />
          </div>
        </section>

        <div className="flex-1">{children}</div>

        <footer className="mt-auto border-t border-slate-200/70 bg-white/60 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 py-12">
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
                  {NAV_LINKS.map(({ href, label }) => (
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
              <p className="text-xs text-slate-400">© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
              <p className="text-xs text-slate-400">18+ · Gamble responsibly</p>
            </div>
            <p className="mt-4 text-xs text-slate-400">{COPY.footer.disclaimer}</p>
          </div>
        </footer>

        <CookieConsent />
      </body>
    </html>
  )
}
