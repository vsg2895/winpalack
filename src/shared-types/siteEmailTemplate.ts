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
  header_title: string
  header_subtitle: string
  heading: string
  intro_text: string
  offer_text: string
  spam_notice: string
  footer_note: string
  unsubscribe_label: string
  copyright_text: string
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
