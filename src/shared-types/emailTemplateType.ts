// Fields match EmailTemplateCatalog::types() — one selectable email template.
// The list is served by the backend catalog, so newly registered templates
// appear in the UI without a frontend change.
export interface EmailTemplateType {
  value: string
  label: string
  description: string
}
