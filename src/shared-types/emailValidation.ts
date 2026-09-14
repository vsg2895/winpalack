/**
 * SendGrid email address validation — admin read models.
 *
 * These mirror the two read-only admin endpoints. There is deliberately no
 * write shape: the log is an audit trail, not an editable table, and nothing in
 * the panel may trigger a re-validation (it would spend a paid credit).
 */

export type EmailValidationVerdict = 'Valid' | 'Risky' | 'Invalid'
/**
 * hard_rejected and soft_rejected are separate on purpose: both refuse the
 * subscriber, but only the second is worth revisiting when tuning thresholds —
 * a hard reject can never be made deliverable by loosening a rule.
 */
export type EmailValidationOutcome = 'allowed' | 'hard_rejected' | 'soft_rejected' | 'failed_open'

/** Machine-readable rule that produced the outcome. */
export type EmailValidationReason =
  | 'invalid_verdict' | 'bad_syntax' | 'no_mx_record'
  | 'low_score' | 'known_bounces' | 'disposable' | 'role_address' | 'verdict_not_allowed'
  | 'missing_key' | 'quota_exhausted' | 'email_cooldown' | 'disabled'
  | 'pending_resend' | 'transport_error'

/** The six checks, as real indexed columns — filterable and aggregatable. */
export interface EmailValidationCheckFlags {
  has_valid_address_syntax: boolean | null
  has_mx_or_a_record: boolean | null
  is_suspected_disposable_address: boolean | null
  is_suspected_role_address: boolean | null
  has_known_bounces: boolean | null
  has_suspected_bounces: boolean | null
}

/** SendGrid's parsed `result.checks` tree, shown in the row detail. */
export interface EmailValidationChecks {
  domain?: {
    has_valid_address_syntax?: boolean
    has_mx_or_a_record?: boolean
    is_suspected_disposable_address?: boolean
  }
  local_part?: {
    is_suspected_role_address?: boolean
  }
  additional?: {
    has_known_bounces?: boolean
    has_suspected_bounces?: boolean
  }
}

export interface EmailValidationLog extends EmailValidationCheckFlags {
  id: number
  site_id: number
  site_name?: string | null
  site_slug?: string | null
  email: string
  verdict: EmailValidationVerdict | null
  score: number | null
  outcome: EmailValidationOutcome
  reason_code: EmailValidationReason | null
  suggestion: string | null
  source: string
  /** The untouched payload, for the collapsible raw block. */
  raw_checks: EmailValidationChecks | null
  was_cached: boolean
  http_status: number | null
  error_message: string | null
  latency_ms: number | null
  quota_month: string
  created_at: string | null
}

/** The analysis panel: all aggregates over the CURRENT filter range. */
export interface EmailValidationAnalysis {
  total: number
  verdicts: Record<string, number>
  outcomes: Record<string, number>
  reasons: Record<string, number>
  /** Keyed by bucket index 0..9, i.e. score 0.0–0.1 … 0.9–1.0. */
  score_histogram: Record<string, number>
  top_rejected_domains: Record<string, number>
  checks: Record<keyof EmailValidationCheckFlags, number>
}

export interface EmailValidationSiteStats {
  site_id: number
  site_name: string
  site_slug: string
  attempts: number
  api_calls: number
  cache_hits: number
  skipped: number
  valid: number
  risky: number
  invalid: number
  allowed: number
  hard_rejected: number
  soft_rejected: number
  failed_open: number
}

export interface EmailValidationQuota {
  month: string
  quota: number
  used: number
  remaining: number
  percent: number
  /** 80–99% used. */
  warning: boolean
  /** 100% — validation is skipping and the flow is failing open. */
  exhausted: boolean
  /** SendGrid's own reported balance; null until the first real call. */
  sendgrid_remaining: number | null
  sendgrid_reset: number | null
  enabled: boolean
  /** Whether a key is present. The key itself is never sent to the client. */
  key_configured: boolean
  allowed_verdicts: string[]
}

export interface EmailValidationStats {
  month: string
  months: string[]
  sites: EmailValidationSiteStats[]
  totals: Omit<EmailValidationSiteStats, 'site_id' | 'site_name' | 'site_slug'>
  quota: EmailValidationQuota
}

/**
 * Result of the admin's ad-hoc single-address check.
 *
 * Distinct from a log row: it carries `would_allow`, which is the question the
 * tool exists to answer — not "what does SendGrid think" in the abstract, but
 * "would this address get a verification email on this site right now".
 */
export interface EmailValidationCheckResult {
  email: string
  site: { id: number; name: string; slug: string }
  /** False when nothing could be checked (no key, quota gone, cooldown, error). */
  checked: boolean
  verdict: EmailValidationVerdict | null
  score: number | null
  checks: EmailValidationChecks | null
  suggestion: string | null
  /** Tri-state: null means never checked, so the UI must not render a decision. */
  would_allow: boolean | null
  outcome: EmailValidationOutcome
  was_cached: boolean
  reason_code: EmailValidationReason | null
  http_status: number | null
  error_message: string | null
  latency_ms: number | null
  allowed_verdicts: string[]
}
