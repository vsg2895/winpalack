// Fields match NavItemResource.php — one editable link in a site's header or
// footer menu.
//
// Site-scoped by design: navigation is the clearest place the six domains should
// differ, and a shared menu would undo that.
//
// The legal/compliance row (T&Cs, privacy, 18+, responsible gambling) is NOT
// modelled here. It stays in each site's code, because the contract in
// docs/admin-first.md keeps the *presence* of compliance markup in code even
// though its text is content — which is also what makes those links impossible
// to delete from the admin.

export type NavLocation = 'header' | 'footer'

export interface NavItem {
  id: number
  site_id: number
  location: NavLocation
  label: string
  /** An internal path ("/casinos") or an absolute http(s) URL. */
  url: string
  position: number
  active: boolean
  /** Only meaningful for absolute URLs. */
  opens_in_new_tab: boolean
}

export interface UpsertNavItemPayload {
  location: NavLocation
  label: string
  url: string
  position?: number
  active?: boolean
  opens_in_new_tab?: boolean
}

/** Both menus in one response — the layout renders both on every page. */
export interface SiteNavigation {
  header: NavItem[]
  footer: NavItem[]
}
