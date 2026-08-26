// Fields match SendgridKeyResource.php — a stored SendGrid API key used as an
// alternative transport for scheduled promotion campaigns. The raw key is never
// returned by the API; only a masked preview (`masked_key`) is exposed.

export type SendgridKeyStatus = 'active' | 'inactive'

export interface SendgridKey {
  id: number
  name: string
  masked_key: string
  status: SendgridKeyStatus
  created_at: string
  updated_at: string
}

// Payload for creating/updating a key. On EDIT, leave `api_key` empty/undefined
// to keep the stored key; provide a value to rotate it.
export interface UpsertSendgridKeyPayload {
  name: string
  api_key?: string | null
  status?: SendgridKeyStatus
}
