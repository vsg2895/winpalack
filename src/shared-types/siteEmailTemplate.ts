// Fields match SiteEmailTemplateResource.php exactly.
// All text fields support placeholders: {{site_name}}, {{site_url}}, {{email}},
// {{year}}, {{unsubscribe_url}}. Body fields (intro/offer/spam/footer notes)
// additionally support a minimal **bold** syntax.
export interface SiteEmailTemplate {
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
  copyright_text: string | null
  accent_color: string
  active: boolean
  // The SendGrid-verified domain the from address must use (read-only hint).
  from_domain: string
  created_at: string
  updated_at: string
}

// Payload for PUT /admin/sites/{id}/email-template — every editable field.
export type UpdateSiteEmailTemplatePayload = Omit<
  SiteEmailTemplate,
  'id' | 'site_id' | 'from_domain' | 'created_at' | 'updated_at'
>
