// Fields match SmtpCredentialResource.php — a stored SMTP server ("Email
// Config") that mails the SAME Mailgun receiver list through a different
// transport.
//
// Mirrors mailgunKey.ts. Two differences are worth knowing:
//
//  1. The password is NEVER returned, not even a prefix. `masked_password` is a
//     length-only placeholder, unlike Mailgun's `masked_key` which shows the
//     first characters. An SMTP password is often a mailbox password reused
//     elsewhere.
//  2. `from_address` is required and IS used as the envelope sender. Mailgun's
//     equivalent is reference-only, because there the site template supplies the
//     sender; an own SMTP server has no other source of identity.
//
// There is no `send_enabled`: this channel has no scheduler and runs only from
// the "Run now" button.

import type { MailgunReceiverTemplate, MailgunSelectionOrder } from './mailgunReceiver'

export type SmtpCredentialStatus = 'active' | 'inactive'

/**
 * What kind of server this points at. Shown as "Type" in the panel.
 *
 * `mailgun_smtp` is Mailgun's SMTP gateway, whose password LOOKS like an API key
 * and is not one — distinguishing it is what stops someone pasting an API key
 * into the password field.
 */
export type SmtpCredentialType = 'own_smtp' | 'mailgun_smtp'

/** `none` means unencrypted; the API maps it to a null Laravel encryption. */
export type SmtpEncryption = 'ssl' | 'tls' | 'none'

export interface SmtpCredential {
  id: number
  name: string
  type: SmtpCredentialType
  host: string
  port: number
  username: string
  encryption: SmtpEncryption
  from_address: string
  from_name: string | null
  /** Length-only placeholder (bullets). Never a prefix of the real value. */
  masked_password: string
  status: SmtpCredentialStatus
  /** Whether the credential has host, username, password AND a from address. */
  can_authenticate: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

// Payload for creating/updating. On EDIT, leave `password` empty/undefined to
// keep the stored one; provide a value to replace it.
export interface UpsertSmtpCredentialPayload {
  name: string
  type: SmtpCredentialType
  host: string
  port: number
  username: string
  password?: string | null
  encryption: SmtpEncryption
  from_address: string
  from_name?: string | null
  status?: SmtpCredentialStatus
}

/**
 * Per-credential targeting. Identical to MailgunReceiverSettings minus
 * `send_enabled` — this channel never runs on a schedule, so a flag governing
 * automatic sending would gate nothing.
 */
export interface SmtpReceiverSettings {
  batch_size: number
  selection_order: MailgunSelectionOrder
  /** Null disables the cooldown filter entirely. */
  cooldown_days: number | null
  message_subject: string | null
  /** Always complete — seeded from `template_source` when never configured. */
  message_template: MailgunReceiverTemplate
  template_source: string | null
  last_run_at: string | null
  /** Live figures from the same selector the sending job uses. */
  eligible_count: number
  next_batch_count: number
  /** Non-null when the credential cannot run, with the reason. */
  blocked_reason: string | null
}
