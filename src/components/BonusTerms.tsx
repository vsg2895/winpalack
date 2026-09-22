import type { SpecialOfferTerms } from '@shared/types/specialOffer'

/**
 * The terms a player needs before depositing, as labelled figures.
 *
 * A Server Component — pure rendering of already-fetched data, and it is exactly
 * the kind of content that must be in the initial HTML.
 *
 * Every row is conditional. An offer with no confirmed terms renders nothing at
 * all rather than a row of dashes, for the same reason the operator profile
 * does: blanks in a table of figures read as zeros.
 *
 * The full-terms link is rendered HERE, next to the numbers, rather than in a
 * footnote. That is a compliance choice, not a layout one — a wagering
 * requirement stated without a route to the operator's own terms is the pattern
 * regulators object to.
 */
export default function BonusTerms({ terms }: { terms: SpecialOfferTerms }) {
  const rows: Array<[string, string]> = []

  const push = (label: string, value: string | null) => {
    const trimmed = (value ?? '').trim()
    if (trimmed !== '') rows.push([label, trimmed])
  }

  push('Wagering', terms.wagering_requirement)
  push('Min deposit', terms.min_deposit)
  push('Max cashout', terms.max_cashout)
  push('Bonus code', terms.bonus_code)

  if (rows.length === 0 && !terms.terms_url && !terms.expires_at) return null

  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4" aria-labelledby="bonus-terms">
      <h3 id="bonus-terms" className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
        Before you claim
      </h3>

      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              {/* Monospaced so figures line up between offers and can be
                  compared down a page rather than read one at a time. */}
              <dd className="font-mono text-sm font-medium text-zinc-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {terms.expires_at && !terms.expired && (
          <span className="text-zinc-500">
            Offer ends <time dateTime={terms.expires_at}>{terms.expires_at}</time>
          </span>
        )}
        {terms.terms_url && (
          <a
            href={terms.terms_url}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex min-h-11 items-center font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            T&amp;Cs apply — read the full terms
          </a>
        )}
      </div>
    </section>
  )
}
