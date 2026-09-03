// Fields match MailgunReceiverResource.php — one address on the Mailgun receiver
// list. Separate from newsletter.ts: that model is per-site with four per-stream
// opt-in tokens; this pool is global to the Mailgun credentials.
//
// `unsubscribe_token` is deliberately absent. It is a bearer credential and is
// never returned by the API — it exists only inside the emailed link.

export type MailgunReceiverSource = 'import' | 'manual'
export type MailgunSelectionOrder = 'newest' | 'oldest'

export interface MailgunReceiver {
  id: number
  email: string
  name: string | null
  source: MailgunReceiverSource
  /** Where this address came from. Required — never null on a row created through the UI. */
  consent_source: string | null
  consent_recorded_at: string | null
  is_active: boolean
  unsubscribed_at: string | null
  last_sent_at: string | null
  sent_count: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface UpsertMailgunReceiverPayload {
  email: string
  name?: string | null
  consent_source: string
}

/** Progress row for a queued spreadsheet import, polled until finished_at. */
export interface MailgunReceiverImport {
  id: number
  filename: string
  consent_source: string
  status: 'queued' | 'running' | 'finished' | 'failed'
  total: number
  imported: number
  duplicates: number
  suppressed: number
  rejected: number
  rejected_rows: string | null
  error: string | null
  finished_at: string | null
}

/**
 * The authored fields behind a credential's message — mirrors
 * MailgunReceiverTemplate::defaults() in the backend.
 *
 * The admin edits these, never HTML: the server renders them into the stored
 * `message_html`, which is why that field is not part of the settings payload.
 * An empty string is the "off switch" for a block — the field keeps no separate
 * visibility flag.
 */
export interface MailgunReceiverTemplate {
  /** Hidden preview line shown under the subject in the inbox list. */
  preheader: string
  heading: string
  /** Body copy. `**bold**` is converted; line breaks are kept. */
  intro_text: string
  secondary_text: string
  button_text: string
  button_url: string
  hero_image_url: string
  hero_url: string
  disclaimer_text: string
  /** Free-text footer identity — sender address, contact, copyright. */
  footer_text: string
  button_text_font_size: number
  background_color: string
  heading_color: string
  text_color: string
  secondary_text_color: string
  muted_text_color: string
  button_color: string
  accent_color: string
}

/** A site's promotion template, offered as the starting point for a receiver message. */
export interface MailgunReceiverTemplateSeed {
  subject: string
  template: MailgunReceiverTemplate
  site_name: string | null
}

/**
 * Per-credential targeting. There is no credential picker anywhere in this
 * feature: the settings belong to the credential, so it is always the sender.
 */
export interface MailgunReceiverSettings {
  send_enabled: boolean
  batch_size: number
  selection_order: MailgunSelectionOrder
  /** Null disables the cooldown filter entirely. */
  cooldown_days: number | null
  message_subject: string | null
  /**
   * Always complete. A credential that has never been configured comes back
   * seeded from `template_source`'s promotion email; a configured one comes back
   * exactly as it was saved.
   */
  message_template: MailgunReceiverTemplate
  /** Name of the site the starting copy came from, or null when there are no sites. */
  template_source: string | null
  last_run_at: string | null
  /** Live figures from the same selector the sending job uses. */
  eligible_count: number
  next_batch_count: number
  /** Non-null when the credential cannot run, with the reason. */
  blocked_reason: string | null
}
