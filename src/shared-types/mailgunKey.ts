// Fields match MailgunKeyResource.php — a stored Mailgun credential used as an
// alternative transport for scheduled promotion campaigns. The raw key is never
// returned by the API; only a masked preview (`masked_key`) is exposed.
//
// Mirrors sendgridKey.ts. The differences are provider-specific: Mailgun
// authenticates a (domain, key) pair, and EU accounts live on a different API
// host, hence `region`.

export type MailgunKeyStatus = 'active' | 'inactive'
export type MailgunRegion = 'us' | 'eu'

export interface MailgunKey {
  id: number
  name: string
  domain: string
  region: MailgunRegion
  /**
   * Sender identity registered with Mailgun for this domain. Recorded for
   * reference only: no send path reads it, because every send takes its sender
   * from the site template's own from_email. Both fields are legitimately null
   * on a credential that works perfectly well.
   */
  from_address: string | null
  from_name: string | null
  masked_key: string
  status: MailgunKeyStatus
  /**
   * Whether the credential can AUTHENTICATE (has a key and a domain).
   * Deliberately unrelated to sender identity.
   */
  can_authenticate: boolean
  created_at: string
  updated_at: string
}

// Payload for creating/updating a credential. On EDIT, leave `api_key`
// empty/undefined to keep the stored key; provide a value to rotate it.
export interface UpsertMailgunKeyPayload {
  name: string
  domain: string
  api_key?: string | null
  region?: MailgunRegion
  from_address?: string | null
  from_name?: string | null
  status?: MailgunKeyStatus
}
