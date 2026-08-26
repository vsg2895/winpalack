// Fields match SiteVerifyEmailResource.php exactly.
// All text fields support placeholders: {{site_name}}, {{site_url}}, {{email}},
// {{year}}, {{unsubscribe_url}}. Body fields (intro/offer/spam/footer notes)
// additionally support a minimal **bold** syntax.
export interface SiteVerifyEmail {
  id: number
  site_id: number
  from_name: string
  from_email: string
  subject: string
  header_title: string | null
  header_subtitle: string | null
  heading: string | null
  intro_text: string | null
  offer_text: string | null
  spam_notice: string | null
  footer_note: string | null
  unsubscribe_label: string
  // Whether the footer unsubscribe LINK is rendered in the body. False hides it;
  // `unsubscribe_label` is kept either way so restoring brings back the same link.
  // Hiding the link never affects the unsubscribe process itself — the
  // List-Unsubscribe headers and the /unsubscribe/{token} endpoint are unchanged.
  unsubscribe_enabled: boolean
  // Footer identity lines. Kept in the database even while hidden, so removing
  // one is a toggle rather than a retype — see `hidden_blocks`.
  postal_address: string | null
  contact_email: string | null
  copyright_text: string | null
  // Optional blocks the admin switched OFF. Anything NOT listed is visible, so
  // an existing row renders unchanged. Keys are limited to
  // SiteVerifyEmail::OPTIONAL_BLOCKS server-side.
  hidden_blocks: string[]
  // Read-only catalogue of what can be hidden, served by the API so the editor
  // never duplicates the list.
  optional_blocks: string[]
  accent_color: string
  active: boolean
  // The SendGrid-verified domain the from address must use (read-only hint).
  from_domain: string
  created_at: string
  updated_at: string
}

// Payload for PUT /admin/sites/{id}/verify-email — every editable field.
export type UpdateSiteVerifyEmailPayload = Omit<
  SiteVerifyEmail,
  | 'id'
  | 'site_id'
  | 'from_domain'
  // Server-owned catalogue; the editor reads it but never sends it back.
  | 'optional_blocks'
  | 'created_at'
  | 'updated_at'
>
