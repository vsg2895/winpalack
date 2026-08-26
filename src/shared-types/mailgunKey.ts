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
  masked_key: string
  status: MailgunKeyStatus
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
  status?: MailgunKeyStatus
}
