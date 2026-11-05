/**
 * The whole of robots.txt, as text (served by app/robots.txt/route.ts).
 *
 * WHY TEXT AND NOT `app/robots.ts`. Cloudflare's "managed robots.txt" used to
 * PREPEND its own block to the file this app served: a content-signals notice,
 * a second `User-agent: *` group (`Content-Signal`, `Allow: /`) and a list of
 * AI crawlers shut out. Two `*` groups are merged by Google, but a parser that
 * stops at the first one never saw `/go/`, `/api/` or the token paths
 * disallowed (SEO audit O6). That block now lives HERE, merged into one `*`
 * group, and Cloudflare's copy is switched off. `Content-Signal` is not a
 * directive `MetadataRoute.Robots` can emit, hence a route handler.
 *
 * The notice, the signal and the crawler list are Cloudflare's managed content
 * as it was served on 2026-11-05, unchanged. Editing the list is a policy
 * decision (which AI crawlers may read the site), not a refactor.
 */

/**
 * Crawlers kept out of the whole site: mostly AI-training and data bots, but
 * Cloudflare's list also holds two search engines (Baiduspider, PetalBot) —
 * carried over as served, not chosen here.
 */
export const BLOCKED_CRAWLERS = [
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'ClaudeBot',
  'Diffbot',
  'Google-Extended',
  'GPTBot',
  'omgili',
  'anthropic-ai',
  'Claude-Web',
  'cohere-ai',
  'MistralAI-Training',
  'meta-externalagent',
  'GoogleOther',
  'Baiduspider',
  'PetalBot',
  'AwarioSmartBot',
  'AwarioRssBot',
  'Google-CloudVertexBot',
  'QualifiedBot',
  'Cotoyogi',
  'ICC-Crawler',
  'atlassian-bot',
  'FishBot',
  'BorderxBot',
  'NavuBot',
  'SemrushBot-SWA',
  'WARDBot',
  'magpie-crawler',
  'KimiBot',
  'CitibotSiteCrawler',
] as const

/** The content-signals preference for every crawler (contentsignals.org). */
const CONTENT_SIGNAL = 'search=yes,ai-train=no,use=reference'

const CONTENT_SIGNALS_NOTICE = `# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
# use:      how AI systems may consume the content (immediate, reference, or full).

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.`

/*
 * /go/* are outbound affiliate redirects, not content. Crawling them wastes
 * budget on 302s, inflates the click counts with bot traffic and points
 * crawlers at operator sites we do not control.
 *
 * /cdn-cgi/ is CLOUDFLARE'S path, not one this app serves: its Email
 * Obfuscation rewrites `mailto:` links into /cdn-cgi/l/email-protection. This
 * line does not clear the old 404s from Search Console (a 404 is the right
 * answer, and blocking it here only keeps them in the report longer); it keeps
 * the rewritten URLs from being crawled as content.
 *
 * Account and token pages: nothing on them is content, and the token pages
 * carry a secret in the path. /register covers /register/verify. There is no
 * search-results URL to block: search runs through /api/search.
 */
const DISALLOWED = ['/api/', '/go/', '/cdn-cgi/', '/login', '/register', '/forum/account', '/verify/', '/unsubscribe/']

export function buildRobotsTxt({ indexing, siteUrl }: { indexing: boolean; siteUrl: string }): string {
  // Local, staging and preview builds shut every crawler out, and say nothing
  // about a sitemap — see lib/seo/indexing.ts for how the deployment is told.
  if (!indexing) return 'User-agent: *\nDisallow: /\n'

  return [
    CONTENT_SIGNALS_NOTICE,
    '',
    // ONE group for every other crawler. A crawler named below obeys only its
    // own group, so these rules never loosen the blocks.
    ['User-agent: *', `Content-Signal: ${CONTENT_SIGNAL}`, 'Allow: /', ...DISALLOWED.map((p) => `Disallow: ${p}`)].join('\n'),
    '',
    // One group, many agents (RFC 9309 §2.1): the same answer for each.
    [...BLOCKED_CRAWLERS.map((ua) => `User-agent: ${ua}`), 'Disallow: /'].join('\n'),
    '',
    // The Google News sitemap beside the regular one: recent posts only, with
    // the news:news fields (app/news-sitemap.xml/route.ts).
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Sitemap: ${siteUrl}/news-sitemap.xml`,
    '',
  ].join('\n')
}
