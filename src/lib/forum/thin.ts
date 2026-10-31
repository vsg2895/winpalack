import { SITE_URL } from '../config'

/**
 * A thread is THIN — `noindex, follow` — while it has at most this many replies
 * AND an opening post shorter than THIN_THREAD_MIN_BODY_CHARS. Both, not either:
 * a long opening post is worth indexing on its own, and so is a short question
 * that people have answered.
 */
export const THIN_THREAD_MAX_REPLIES = 0

/** Visible characters of the opening post, markup excluded. */
export const THIN_THREAD_MIN_BODY_CHARS = 300

/** The opening post's text as a reader sees it, for measuring. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isThinThread(thread: { posts_count: number; body?: string | null }): boolean {
  return (
    thread.posts_count <= THIN_THREAD_MAX_REPLIES &&
    visibleText(thread.body ?? '').length < THIN_THREAD_MIN_BODY_CHARS
  )
}

const SITE_HOST = new URL(SITE_URL).host

/**
 * Marks every link that leaves this site with `rel="ugc nofollow noopener"`.
 *
 * Applied to the thread body, the forum's only HTML. It is written in the admin
 * and filtered server-side (ForumContent::articleBody), so it is not strictly
 * user-generated — but it sits on a page that is, and a link out of a forum
 * thread should never pass this domain's authority to whatever it names.
 * Member replies are rendered as plain text, so they carry no links at all.
 *
 * Internal and relative links are left alone. An existing `rel` on an outbound
 * link is replaced rather than merged: the three values are the whole policy.
 */
export function withUgcRel(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? ''

    let host: string
    try {
      host = new URL(href).host
    } catch {
      return tag // relative, fragment or malformed: not outbound
    }

    if (host === SITE_HOST) return tag

    const withoutRel = attrs.replace(/\srel\s*=\s*(["']).*?\1/gi, '')
    return `<a${withoutRel} rel="ugc nofollow noopener">`
  })
}
