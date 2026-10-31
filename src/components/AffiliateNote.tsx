import Link from 'next/link'

/**
 * The one-line affiliate disclosure, linking to the full page.
 *
 * Placed above every casino list and beside the main "Visit" / "Claim" buttons:
 * the reader learns how the site is paid at the moment they could act on a
 * link that pays it, not only from a footer page. A server component — the
 * sentence is part of the indexed HTML.
 */
export default function AffiliateNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      We may earn a commission when you sign up through links on this page, at no cost to you. It never
      changes our ratings.{' '}
      <Link href="/affiliate-disclosure" className="underline underline-offset-2 hover:text-emerald-700">
        Affiliate disclosure
      </Link>
      . 18+ — check that online gambling is legal where you live.
    </p>
  )
}
