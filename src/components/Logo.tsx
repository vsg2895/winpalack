import Link from 'next/link'

/**
 * Winpalack brand logo.
 *
 * Inline markup (not an <img>), so it renders instantly with no extra request.
 * It is wrapped in a Next.js <Link> to the home page; the Link carries the
 * accessible name via aria-label, so the decorative artwork is aria-hidden to
 * avoid a duplicate announcement.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Winpalack home"
      className={`inline-flex min-h-11 shrink-0 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {/* Mark + live text rather than one SVG wordmark: the text uses the
          site's own font and stays crisp at any zoom, and the tile is the same
          shield-and-check as the footer and the hero card. */}
      <span
        aria-hidden
        className="grid h-10 w-10 max-[374px]:h-9 max-[374px]:w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/25 sm:h-11 sm:w-11"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M12 3l7 3v5.5c0 4.3-2.9 7.2-7 8.5-4.1-1.3-7-4.2-7-8.5V6l7-3z" />
          <path d="M9 12l2.2 2.2L15.5 10" />
        </svg>
      </span>
      {/* A step smaller below 375px: at 320 the full-size wordmark plus the
          search, account and menu buttons came to 341px in a 288px row. */}
      <span aria-hidden className="ml-3 text-xl max-[374px]:ml-2 max-[374px]:text-lg tracking-tight sm:text-[1.375rem]">
        <span className="font-bold text-slate-900">Win</span>{' '}
        <span className="font-semibold text-emerald-600">palack</span>
      </span>
    </Link>
  )
}
