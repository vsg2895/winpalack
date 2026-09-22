import Link from 'next/link'

/**
 * The visible breadcrumb trail.
 *
 * Renders exactly the crumbs the page also emits as BreadcrumbList JSON-LD —
 * both come from one array in the page, because structured data that disagrees
 * with what a visitor sees is a manual-action risk, not a clever shortcut.
 *
 * The last crumb is the current page: not a link, and marked `aria-current`.
 */
export default function Breadcrumbs({ crumbs }: { crumbs: Array<{ name: string; href: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="font-medium text-slate-700">{crumb.name}</span>
              ) : (
                <Link href={crumb.href} className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-emerald-700">{crumb.name}</Link>
              )}
              {!last && <span aria-hidden className="text-slate-300">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
