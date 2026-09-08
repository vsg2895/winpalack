import type { CasinoDetail } from '@shared/types/casinoDetail'
import { COPY } from '@/constants/copy'

/**
 * The casino's factual profile — licence, payments, support, safer-play tools.
 *
 * A Server Component: it is pure rendering of already-fetched data and is the
 * densest indexable content on the page, so making it client-side would remove
 * it from the initial HTML, which on this project is the same as deleting it.
 *
 * THE RULE HERE IS THE EMPTY STATE. Every group renders only when it has values,
 * and a group with no filled rows is omitted entirely rather than showing labels
 * with dashes. A detail table of mostly-blank rows reads worse than no table,
 * and it invites the reader to assume the blanks are zeros.
 *
 * `null` on a boolean means "we have not checked", which is NOT the same claim
 * as `false` ("the operator does not offer this"). Nulls are dropped; only a
 * real yes or no is ever shown.
 */

type Row = { label: string; value: string }

function yesNo(value: boolean | null | undefined, yes = 'Yes', no = 'No'): string | null {
  if (value === true) return yes
  if (value === false) return no
  return null
}

function list(values: string[] | undefined): string | null {
  return values && values.length > 0 ? values.join(' · ') : null
}

function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** Drops every row whose value resolved to null, so callers can list rows freely. */
function rows(candidates: Array<[string, string | null]>): Row[] {
  return candidates
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({ label, value }))
}

function Group({ title, items }: { title: string; items: Row[] }) {
  if (items.length === 0) return null

  return (
    <section className="border-t border-zinc-100 py-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">{title}</h3>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-zinc-100 pb-2">
            <dt className="text-sm text-zinc-500">{item.label}</dt>
            <dd className="text-right text-sm font-medium text-zinc-800">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function CasinoProfile({ detail, casinoName }: { detail: CasinoDetail; casinoName: string }) {
  const general = rows([
    ['Established', detail.established_year ? String(detail.established_year) : null],
    ['Operated by', text(detail.company)],
    ['Licence', list(detail.licences)],
    ['Currencies', list(detail.currencies)],
  ])

  const payments = rows([
    ['Payment methods', list(detail.payment_methods)],
    ['Minimum deposit', text(detail.min_deposit)],
    ['Minimum withdrawal', text(detail.min_withdrawal)],
    ['Withdrawal limit', text(detail.withdrawal_limit)],
    ['Pending time', text(detail.pending_time)],
    ['Withdrawal time', text(detail.withdrawal_time)],
    ['Verification', text(detail.verification_speed)],
    // Phrased as the thing a player wants to hear, not as the raw column name.
    ['Deposit fees', yesNo(detail.deposit_fees, 'Charged', 'None')],
    ['Withdrawal fees', yesNo(detail.withdrawal_fees, 'Charged', 'None')],
  ])

  const games = rows([
    ['Providers', list(detail.game_providers)],
    ['RNG tested', yesNo(detail.rng_tested)],
    ['Progressive jackpots', yesNo(detail.progressive_jackpots)],
  ])

  const support = rows([
    ['Live chat', yesNo(detail.live_chat)],
    ['Email support', yesNo(detail.email_support)],
    ['Support address', text(detail.support_email)],
    ['Languages', list(detail.support_languages)],
  ])

  // The group this site exists for. Listed individually rather than as a count,
  // because "4 of 6 tools" tells a reader nothing about WHICH four.
  const tools = rows([
    ['Deposit limit', yesNo(detail.tool_deposit_limit, 'Offered', 'Not offered')],
    ['Loss limit', yesNo(detail.tool_loss_limit, 'Offered', 'Not offered')],
    ['Session limit', yesNo(detail.tool_session_limit, 'Offered', 'Not offered')],
    ['Reality check', yesNo(detail.tool_reality_check, 'Offered', 'Not offered')],
    ['Withdrawal lock', yesNo(detail.tool_withdrawal_lock, 'Offered', 'Not offered')],
    ['Self-exclusion', yesNo(detail.tool_self_exclusion, 'Offered', 'Not offered')],
  ])

  const groups = [
    { title: 'General', items: general },
    { title: 'Payments and withdrawals', items: payments },
    { title: 'Games', items: games },
    { title: 'Support', items: support },
    { title: 'Safer-play tools', items: tools },
  ].filter((group) => group.items.length > 0)

  // Nothing verified yet: render nothing at all rather than an empty shell with
  // a heading promising facts that are not there.
  if (groups.length === 0) return null

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6" aria-labelledby="operator-profile">
      <h2 id="operator-profile" className="text-xl font-bold text-zinc-900">
        {casinoName} {COPY.casinos.profileHeadingTail}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">{COPY.casinos.profileIntro}</p>

      <div className="mt-4">
        {groups.map((group) => (
          <Group key={group.title} title={group.title} items={group.items} />
        ))}
      </div>
    </section>
  )
}
