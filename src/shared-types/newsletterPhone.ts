// Fields match NewsletterPhoneResource.php — one number on the STANDALONE
// phone-newsletter list (`newsletters_based_on_phone`).
//
// Not site-scoped and unrelated to the email `newsletters` table: an SMS carries
// no per-site branding, so a single global list is the correct model. See the
// create_newsletters_based_on_phone migration for the full reasoning.

export interface NewsletterPhone {
  id: number
  phone: string // E.164, e.g. "+15551234567"
  opted_out: boolean
  opted_out_at: string | null
  created_at: string
  updated_at: string
}

// ── Audience filters ─────────────────────────────────────────────────────────
// Mirrors PhoneAudienceFilter::MODES. Absent mode means "no date constraint".

export type PhoneDateMode =
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'on' // added on exactly this date
  | 'before' // added before this date
  | 'after' // added after this date
  | 'range' // added between two dates

export interface PhoneAudienceFilters {
  mode?: PhoneDateMode | null
  date_from?: string | null // Y-m-d
  date_to?: string | null // Y-m-d
  limit?: number | null // cap on the newest N
  search?: string | null
}

// ── Import ───────────────────────────────────────────────────────────────────
// The import runs on the `high` queue; this is the record the panel polls.

export type PhoneImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface PhoneImportProgress {
  import_id: number
  status: PhoneImportStatus
  finished: boolean
  imported: number // numbers actually added
  skipped: number // already on the list, or repeated within the file
  invalid: number // non-empty cells that were not usable numbers
  total: number // data rows read, excluding a recognised header
  error: string | null
  message: string
}

// ── Bulk send ────────────────────────────────────────────────────────────────

// What a send with the current filters WOULD reach — resolved by the same query
// the send itself uses, so it is a prediction rather than an estimate.
export interface PhoneRecipientPreview {
  total: number
  sample: Array<{ phone: string; created_at: string }>
  sample_size: number
  filters: string // human-readable description of the selection
}

export interface BulkSmsResult {
  ok: boolean
  recipients: number
  filters: string
  message: string
}

// ── Send history ─────────────────────────────────────────────────────────────
// One row per send ATTEMPT — the per-recipient outcome of a bulk run.

export type SmsHistoryStatus = 'sent' | 'failed'

export interface PhoneSmsHistory {
  id: number
  phone: string
  status: SmsHistoryStatus
  message_sid: string | null
  error_code: number | null
  error: string | null
  body: string | null
  twilio_config?: { id: number; name: string } | null
  created_at: string
}
