// Who stands behind a site's reviews.
//
// `author` is null unless the site has BOTH switched the byline on AND entered a
// name. There is deliberately no partial state: a byline exists to name a real
// person, so a nameless one is worse than none. The front end renders nothing
// rather than a placeholder.

export interface EditorialAuthor {
  name: string
  /** e.g. "Editor" — optional; the byline reads fine without it. */
  role: string | null
  bio: string | null
  avatar_path: string | null
}

export interface SiteEditorial {
  author: EditorialAuthor | null
  /**
   * Slug of the CMS page describing how reviews are done. Null means none is
   * published — and the front end then links to nothing, because claiming a
   * methodology that does not exist is the failure this feature risks.
   */
  methodology_page_slug: string | null
}
