import Link from 'next/link'
import type { Byline as BylineData, BylinePerson } from '@shared/types/author'

/**
 * "Written by <author> · Reviewed by <reviewer> · Updated <date>".
 *
 * Renders nothing unless the API named at least one VISIBLE person — the
 * backend sends `byline: null` otherwise, and a date with nobody behind it is
 * not shown, because "Updated" alone implies someone checked the page.
 *
 * Each name links to that person's /authors page, which is what makes the
 * byline verifiable rather than decorative.
 */

function formatDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Person({ person }: { person: BylinePerson }) {
  return (
    <Link href={`/authors/${person.slug}`} className="font-semibold text-slate-800 underline-offset-4 hover:text-emerald-700 hover:underline">
      {person.name}
    </Link>
  )
}

export default function Byline({
  byline,
  methodologySlug = null,
  className = '',
}: {
  byline: BylineData | null | undefined
  /** The CMS page describing how reviews are done; linked when set. */
  methodologySlug?: string | null
  className?: string
}) {
  if (!byline || (!byline.author && !byline.reviewer)) return null

  const updated = formatDate(byline.last_reviewed_at)
  const parts: React.ReactNode[] = []

  if (byline.author) {
    parts.push(
      <span key="author">
        Written by <Person person={byline.author} />
      </span>,
    )
  }
  // The same person in both roles is said once.
  if (byline.reviewer && byline.reviewer.slug !== byline.author?.slug) {
    parts.push(
      <span key="reviewer">
        Reviewed by <Person person={byline.reviewer} />
      </span>,
    )
  }
  if (updated && byline.last_reviewed_at) {
    parts.push(
      <span key="updated">
        Updated <time dateTime={byline.last_reviewed_at}>{updated}</time>
      </span>,
    )
  }
  if (methodologySlug) {
    parts.push(
      <Link key="method" href={`/${methodologySlug}`} className="underline underline-offset-4 hover:text-emerald-700">
        How we rate
      </Link>,
    )
  }

  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 ${className}`}>
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-slate-300">·</span>}
          {part}
        </span>
      ))}
    </p>
  )
}
