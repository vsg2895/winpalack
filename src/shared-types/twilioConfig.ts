// Fields match TwilioConfigResource.php — a stored Twilio credential used to
// authenticate bulk SMS sends.
//
// `account_sid` and `auth_token` arrive MASKED and are never the real values.
// The raw token leaves the database exactly once, server-side, to sign a request.

export type TwilioConfigStatus = 'active' | 'inactive'

export interface TwilioConfig {
  id: number
  name: string
  account_sid: string // masked preview, e.g. "AC1234…7f9e"
  auth_token: string // masked preview — never the real token
  from_number: string | null
  messaging_service_sid: string | null
  sender: string // whichever of the two a send will actually use
  has_sender: boolean // false = this credential cannot send anything
  status: TwilioConfigStatus
  created_at: string
  updated_at: string
}

// Create/update payload. On update, leave `auth_token` blank to keep the stored
// token — the admin never sees the raw value, so re-typing it every edit is
// impractical.
export interface TwilioConfigPayload {
  name: string
  account_sid: string
  auth_token?: string
  from_number?: string | null
  messaging_service_sid?: string | null
  status?: TwilioConfigStatus
}

export interface TwilioTestResult {
  ok: boolean
  message: string
  message_sid?: string | null
  error_code?: number | null
}
