import Link from 'next/link'

/**
 * Winpalack brand logo.
 *
 * The SVG is inlined (not an <img>) so it renders instantly with no extra
 * request, scales crisply at any size, and inherits the current color context.
 * It is wrapped in a Next.js <Link> to the home page; the Link carries the
 * accessible name via aria-label, so the decorative artwork is aria-hidden to
 * avoid a duplicate announcement.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Winpalack home"
      className={`inline-flex shrink-0 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      <svg
        viewBox="0 0 680 260"
        className="h-9 w-auto sm:h-10"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(60,50)">
          <rect x="0" y="0" width="160" height="160" rx="44" fill="#059669" />
          <rect x="0" y="0" width="160" height="160" rx="44" fill="#34D399" opacity="0.35" />

          {/* Shield = safe / responsible play */}
          <path
            d="M80 32 L122 50 V88 C122 114 103 130 80 140 C57 130 38 114 38 88 V50 Z"
            fill="#FFFFFF"
          />
          {/* Check mark */}
          <path
            d="M60 86 l15 15 l26 -33"
            fill="none"
            stroke="#0D9488"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g transform="translate(250,0)">
          <text x="0" y="150" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="66" fontWeight="600" fill="#065F46">Win</text>
          <text x="150" y="150" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="66" fontWeight="400" fill="#10B981">palack</text>
          <text x="4" y="185" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="21" fontWeight="400" fill="#64748B" letterSpacing="4">winpalack.com</text>
        </g>
      </svg>
    </Link>
  )
}
