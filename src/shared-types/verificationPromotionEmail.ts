// Fields match VerificationPromotionEmailResource.php exactly.
//
// This is the ONE global post-verification promotion — there is deliberately no
// `site_id`. Subscribers from every registered site receive this same template,
// so only placeholders available on every site may be used:
// {{site_name}}, {{site_url}}, {{email}}, {{year}}, {{unsubscribe_url}}.
// Body fields (intro/secondary/disclaimer/notice/tagline/disclosure) support **bold**.

// One footer navigation link — label + destination URL (both accept placeholders).
export interface FooterLink {
  label: string
  url: string
}

// One offer "ticket" term — a column label + its value (e.g. Wagering / 40x).
export interface OfferTerm {
  label: string
  value: string
}

export interface VerificationPromotionEmail {
  id: number
  from_name: string
  from_email: string
  subject: string
  // Removable content blocks — null means the email omits that block entirely.
  preheader: string | null
  hero_image_url: string | null
  hero_url: string | null
  top_button_text: string | null
  // Where the TOP button points. Empty falls back to `hero_url`, then the site.
  top_button_url: string | null
  heading: string | null
  intro_text: string | null
  // Intro paragraph styling. Null means "as before": the layout's own 16px, and
  // no panel. A background colour turns the paragraph into a padded panel like
  // the responsible-gambling notice.
  intro_text_font_size: number | null
  intro_text_background_color: string | null
  secondary_text: string | null
  cta_button_text: string | null
  // Where the CTA points. Empty falls back to `hero_url`, then the site URL — so
  // leaving it blank keeps the button's existing destination.
  cta_button_url: string | null
  disclaimer_text: string | null
  // Structural — the opt-out link is legally required and cannot be removed.
  unsubscribe_label: string
  // Blocks the admin has switched OFF. Every one of them still has its text
  // stored in its own field, so restoring a block means dropping its key from
  // here — nothing is ever retyped. Keys come from `optional_blocks`.
  hidden_blocks: string[]
  // Read-only catalogue of everything that can be hidden, served by the API so
  // the editor never duplicates the list.
  optional_blocks: string[]
  // Read-only sizing bounds, so the admin input never hard-codes them.
  intro_text_min_size: number
  intro_text_max_size: number
  intro_text_default_size: number
  // Which site the PREVIEW and test render {{site_name}} / {{site_url}} against.
  // Persisted so reopening the editor keeps the admin's choice. NOT ownership —
  // this template is global, and the automatic send resolves the site from each
  // subscriber's own newsletters.site_id.
  preview_site_id: number | null

  // ── New design components (removable — null omits the block) ─────────────────
  header_brand_text: string | null
  // Thin green strip at the top: the one-line email-confirmed fact.
  confirmation_text: string | null
  eyebrow_text: string | null
  // Bonus-amount headline of the offer "ticket".
  highlight_text: string | null
  // Ordered list of the ticket's term columns. Always an array (may be empty).
  offer_terms: OfferTerm[]
  responsible_notice_text: string | null
  footer_tagline: string | null
  // Ordered list of footer nav links. Always an array (may be empty).
  footer_links: FooterLink[]
  affiliate_disclosure_text: string | null
  // Footer legal / contact lines
  reason_text: string | null
  age_disclaimer_text: string | null
  postal_address: string | null
  contact_email: string | null
  email_preferences_label: string | null
  email_preferences_url: string | null
  copyright_text: string | null

  // Palette (hex). Never null; the API fills in the design default.
  button_color: string
  accent_color: string
  background_color: string
  body_background_color: string
  header_color: string
  heading_color: string
  text_color: string
  secondary_text_color: string
  muted_text_color: string
  footer_background_color: string
  footer_link_color: string
  footer_text_color: string

  // ── Settings ───────────────────────────────────────────────────────────────
  // Master switch for the whole feature. False = nothing is ever sent.
  active: boolean
  // Minutes after `newsletters.verified_at` (the moment the subscriber clicked
  // the verify link) at which the promotion becomes eligible — not measured
  // from when they subscribed.
  delay_minutes: number
  // Transport:
  //   'sendgrid_env' — SendGrid via the .env SENDGRID_API_KEY (no key to pick)
  //   'mailgun'      — a Mailgun credential stored in the admin
  //   'smtp'         — the .env SMTP mailer
  // 'sendgrid' (a stored SendGrid key) is retired for this feature but still
  // recognised, so a row saved before the change keeps working.
  provider: EmailProvider
  sendgrid_key_id: number | null
  mailgun_key_id: number | null
  // Server-side cap, surfaced so the form can validate against the same bound.
  max_delay_minutes: number
  // Whether SENDGRID_API_KEY is set on the server. False hides the SendGrid
  // option, matching how a provider with no stored keys is hidden. Never
  // carries the key itself.
  sendgrid_env_available: boolean

  // The SendGrid-verified domain the from address should use (read-only hint).
  from_domain: string
  created_at: string
  updated_at: string
}

export type EmailProvider = 'smtp' | 'sendgrid_env' | 'mailgun' | 'sendgrid'

// Payload for PUT /admin/verification-promotion — every editable field.
export type UpdateVerificationPromotionEmailPayload = Omit<
  VerificationPromotionEmail,
  | 'id'
  | 'from_domain'
  | 'max_delay_minutes'
  | 'sendgrid_env_available'
  // Server-owned catalogue; the editor reads it but never sends it back.
  | 'optional_blocks'
  | 'intro_text_min_size'
  | 'intro_text_max_size'
  | 'intro_text_default_size'
  | 'created_at'
  | 'updated_at'
>
