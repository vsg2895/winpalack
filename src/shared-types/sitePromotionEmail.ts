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
  preheader: string
  hero_image_url: string | null
  hero_url: string
  top_button_text: string
  heading: string
  intro_text: string
  secondary_text: string
  cta_button_text: string
  disclaimer_text: string
  unsubscribe_label: string
  // CTA button fill colour and link/accent colour (hex).
  button_color: string
  accent_color: string
  active: boolean
  // The SendGrid-verified domain the from address must use (read-only hint).
  from_domain: string
  created_at: string
  updated_at: string
}

// Payload for PUT /admin/sites/{id}/promotion-email — every editable field.
export type UpdateSitePromotionEmailPayload = Omit<
  SitePromotionEmail,
  'id' | 'site_id' | 'from_domain' | 'created_at' | 'updated_at'
>
