/**
 * The icon for a board.
 *
 * The admin stores a short TOKEN ("slots", "payments"), never a path and never
 * markup — so nothing an operator types can reach the DOM as HTML. This maps the
 * token to one of the site's own inline SVGs; an unknown token falls back to the
 * generic one rather than rendering nothing, so a typo degrades to a plain icon
 * instead of a hole in the layout.
 */
const PATHS: Record<string, string> = {
  slots:    'M4 6h16v12H4z M8 6v12 M16 6v12',
  payments: 'M3 7h18v10H3z M3 11h18',
  support:  'M12 3a7 7 0 0 0-7 7v4a3 3 0 0 0 3 3h1v-6H7v-1a5 5 0 0 1 10 0v1h-2v6h1a3 3 0 0 0 3-3v-4a7 7 0 0 0-7-7z',
  bonuses:  'M12 3l2.4 5.2 5.6.7-4.2 3.9 1.1 5.6L12 15.7 7.1 18.4l1.1-5.6L4 8.9l5.6-.7z',
  general:  'M4 5h16v11H9l-5 4z',
}

export default function BoardIcon({ icon, className = '' }: { icon: string | null; className?: string }) {
  const d = (icon && PATHS[icon]) || PATHS.general

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}
