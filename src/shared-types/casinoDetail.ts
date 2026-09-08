// Fields match CasinoDetailResource.php — the factual profile of one casino:
// licence, payments, support and safer-play tools.
//
// Global master data, like the casino itself. A licence and a withdrawal time
// are facts about the operator, not opinions this network holds, so they are
// identical on every site that renders them.
//
// EVERY scalar is nullable and every list may be empty. A half-known operator is
// the normal case — the public page renders a group only when it has values, and
// a mostly-blank table reads worse than no table at all.
//
// The booleans are `boolean | null` on purpose. `null` means "not checked";
// `false` means "the operator does not offer this". On the safer-play tools that
// is the difference between an unknown and an accusation, so never collapse the
// two when rendering — show nothing for null.

export interface CasinoDetail {
  // General
  established_year: number | null
  company: string | null
  licences: string[]
  currencies: string[]

  // Payments
  payment_methods: string[]
  /** Free text, not a number: operators state these as ranges and per-method values. */
  min_deposit: string | null
  min_withdrawal: string | null
  withdrawal_limit: string | null
  pending_time: string | null
  withdrawal_time: string | null
  verification_speed: string | null
  deposit_fees: boolean | null
  withdrawal_fees: boolean | null

  // Games
  game_providers: string[]
  rng_tested: boolean | null
  progressive_jackpots: boolean | null

  // Support
  live_chat: boolean | null
  email_support: boolean | null
  support_email: string | null
  support_languages: string[]

  // Safer play — the fields winpalack's positioning rests on.
  tool_deposit_limit: boolean | null
  tool_loss_limit: boolean | null
  tool_session_limit: boolean | null
  tool_reality_check: boolean | null
  tool_withdrawal_lock: boolean | null
  tool_self_exclusion: boolean | null
}

/** The admin form posts the same shape it reads. */
export type UpsertCasinoDetailPayload = Partial<CasinoDetail>
