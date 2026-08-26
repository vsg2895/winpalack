// Fields match SmsTemplateResource.php — a reusable, admin-editable SMS text.
//
// A template is a starting point, not the payload: the send transmits and records
// the body as it stood in the compose box, so editing a template later never
// changes a run already queued or rewrites what history says was sent.

export type SmsTemplateStatus = 'active' | 'inactive'

export interface SmsTemplate {
  id: number
  name: string
  body: string
  preview: string // one-line, whitespace-collapsed, for the listing
  status: SmsTemplateStatus

  // Cost per recipient, computed server-side for the listing. The editor
  // recomputes these live from the same rule (see utils/smsSegments.ts).
  length: number
  segments: number
  uses_unicode: boolean

  created_at: string
  updated_at: string
}

export interface SmsTemplatePayload {
  name: string
  body: string
  status?: SmsTemplateStatus
}
