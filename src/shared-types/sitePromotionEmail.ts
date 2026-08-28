// Fields match SitePromotionEmailResource.php exactly.
// All text fields support placeholders: {{site_name}}, {{site_url}}, {{email}},
// {{year}}, {{unsubscribe_url}}. Body fields (intro/secondary/disclaimer)
// additionally support a minimal **bold** syntax.
export interface SitePromotionEmail {
  id: number
  site_id: number
  from_name: string
  from_email: string
  subject: string
  // Removable content blocks — null means the email omits that block entirely.
  // Each is independent: any combination can be cleared.
  preheader: string | null
  hero_image_url: string | null
  hero_url: string | null
  top_button_text: string | null
  // Where the top button points. Empty falls back to `cta_button_url` and then
  // `hero_url`, so a row that never had one keeps its current destination.
  top_button_url: string | null
  heading: string | null
  intro_text: string | null
  secondary_text: string | null
  // Where the buttons point. Empty falls back to `hero_url`, so leaving it blank
  // keeps the current destination.
  cta_button_url: string | null
  disclaimer_text: string | null
  // Structural — the opt-out link is legally required and cannot be removed.
  unsubscribe_label: string
  // Footer identity lines. Kept in the database even while hidden, so removing
  // one is a toggle rather than a retype — see `hidden_blocks`.
  postal_address: string | null
  contact_email: string | null
  copyright_text: string | null
  // Button label size in px. Null = the size this template has always rendered
  // at (they differ per template on purpose, so no existing email changes).
  button_text_font_size: number | null
  // Read-only sizing bounds, so the admin input never hard-codes them.
  button_text_min_size: number
  button_text_max_size: number
  button_text_default_size: number
  // Blocks the admin has switched OFF. Each still has its content stored in its
  // own field, so restoring one means dropping its key from here — never a
  // retype. Keys come from `optional_blocks`.
  hidden_blocks: string[]
  // Read-only catalogue of what can be hidden, served by the API so the editor
  // never duplicates the list.
  optional_blocks: string[]
  // Palette (hex). Never null: the API falls back to the design default for any
  // colour a row predates, so the email always renders a complete palette.
  button_color: string          // CTA button fill
  accent_color: string          // unsubscribe link
  background_color: string      // the email canvas
  heading_color: string         // the heading
  text_color: string            // greeting + intro paragraph
  secondary_text_color: string  // secondary paragraph
  muted_text_color: string      // disclaimer + the line around the unsubscribe link
  active: boolean
  // The SendGrid-verified domain the from address must use (read-only hint).
  from_domain: string
  created_at: string
  updated_at: string
}

// Payload for PUT /admin/sites/{id}/promotion-email — every editable field.
export type UpdateSitePromotionEmailPayload = Omit<
  SitePromotionEmail,
  | 'id'
  | 'site_id'
  | 'from_domain'
  // Server-owned catalogue; the editor reads it but never sends it back.
  | 'optional_blocks'
  | 'button_text_min_size'
  | 'button_text_max_size'
  | 'button_text_default_size'
  | 'created_at'
  | 'updated_at'
>
