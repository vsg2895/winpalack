// Fields match RedirectResource.php — one URL redirect for one site.
//
// Site-scoped because the six domains have different URL histories. Paths are
// normalised on the server (leading slash, no trailing slash, lower-cased) and
// the site's middleware normalises the incoming pathname the same way, or
// nothing would ever match.

export interface Redirect {
  id: number
  site_id: number
  /** Always a path beginning with "/". */
  source_path: string
  /** A path, or an absolute https:// URL when redirecting off-site. */
  destination_path: string
  /** 301 permanent, 302 temporary. */
  status_code: 301 | 302
  active: boolean
  /** Incremented on use — shows which rules still matter. */
  hits: number
  created_at: string
}

export interface UpsertRedirectPayload {
  source_path: string
  destination_path: string
  status_code?: 301 | 302
  active?: boolean
}
