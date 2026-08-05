import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Branded 404.
 *
 * Next returns the correct 404 status either way, but the default page is a
 * dead end: no navigation, no internal links. That wastes the crawl and loses
 * the visitor. `noindex, follow` is the right pair here — the page itself must
 * never be indexed, while the links on it should still pass crawl signal.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/casinos', label: 'Casinos' },
  { href: '/categories', label: 'Categories' },
  { href: '/special-offers', label: 'Special Offers' },
]

export default function NotFound() {
  return (
    <main className="px-4 py-24">
      <div className="container mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: '#059669' }}>
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-4 text-slate-500">
          The page may have moved or no longer exists. Try one of these instead:
        </p>
        <nav aria-label="Helpful links" className="mt-8">
          <ul className="flex flex-wrap justify-center gap-3" role="list">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
