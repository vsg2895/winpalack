/**
 * All user-facing and SEO-facing wording for this site.
 *
 * The KEY STRUCTURE is identical across idevaffiliation, winpalack and
 * roulettingo — same groups, same keys, same order — so the three apps stay
 * interchangeable and a component written for one works on all of them.
 *
 * The WORDS are deliberately unique to this site. That is not decoration: the
 * three brands are separate domains serving the same catalogue, and if they
 * shipped the same titles, descriptions and headings, Google would treat them as
 * duplicate content and suppress all but one. Every string that reaches a
 * <title>, a meta description, an <h1>/<h2> or a JSON-LD field must therefore
 * read differently here than on the sibling sites.
 *
 * winpalack's angle: player protection — licensing, withdrawal limits and
 * safer-play tools are checked before anything gets listed.
 */
export const COPY = {
  // SEO identity. These three reach the <title>, the meta description and the
  // keywords tag on EVERY page that does not set its own — which is most of
  // them — so they are the strings most likely to be read as duplicate content
  // if a sibling domain ships the same words. Kept here, beside the rest of this
  // site's wording, rather than inline in layout.tsx.
  site: {
    titleTail: 'Verified Casinos, Fair Bonuses & Safer Play',
    description:
      'lists only casinos that treat players fairly: verified licences, bonuses with readable terms, and the tools to set a limit before you play.',
    keywords: [
      'fair online casinos',
      'verified casino licences',
      'transparent bonus terms',
      'responsible gambling tools',
      'safer casino play',
    ],
  },
  nav: {
    casinos: 'Casinos',
    specialOffers: 'Special Offers',
    categories: 'Categories',
  },
  home: {
    heroEyebrow: 'Player Protection First',
    // Split in two so the JSX keeps its gradient <span> while the words change.
    heroHeadline: 'Play where the house',
    heroHighlight: 'plays fair',
    heroSubtitle:
      'Licence, withdrawal limits and safer-play tools are verified before a casino earns a place on this list.',
    topCasinosTitle: 'Verified Casinos',
    topCasinosSubtitle: 'Each one cleared our licensing and payout checks. Filter them by category.',
    featuredCasinos: 'See Verified Casinos',
    specialOffers: 'Offers With Fair Terms',
    viewAll: 'View All',
    // Leads the home <title>; the year and brand are appended in page.tsx.
    homeTitle: 'Verified Casinos & Safer Play',
    faqTitle: 'Questions about safer play',
    metaDescription:
      'Online casinos checked for licensing, fair withdrawal limits and responsible-play tools before we recommend them to anyone.',
  },
  casinos: {
    pageTitle: 'Verified Casino Reviews',
    pageDescription:
      'Licensed casinos assessed for withdrawal limits, complaint history and the safer-play tools they give players.',
    // Meta-description fallback for a casino review page. Casino records are
    // GLOBAL master data shared by every site, so without a per-site line here
    // all four domains would ship the identical description for the same casino.
    // Short per-site tail appended to an ADMIN-ENTERED casino meta description.
    // Casino records are shared by every site, so without this the same
    // description would ship on all four domains the moment the field is filled.
    reviewSignature: 'Licence and payout limits verified.',
    reviewSummary: 'checked for licensing, withdrawal limits and the safer-play tools it gives players.',
    visitCasino: 'Go to Casino',
    readReview: 'Read Safety Review',
    rating: 'Safety Score',
    noResults: 'No verified casinos match this filter yet.',
  },
  specialOffers: {
    pageTitle: 'Verified Casino Offers',
    pageDescription:
      'Bonuses with their wagering requirements and withdrawal caps stated up front, so nothing catches you out after you deposit.',
    // Appended to an offer's (shared) bonus text so the four sites do not ship
    // an identical meta description for the same offer.
    offerMetaSuffix: 'Wagering requirements and withdrawal caps stated up front, so nothing surprises you later.',
    claim: 'Claim Safely',
    noResults: 'No verified offers are running right now.',
  },
  categories: {
    pageTitle: 'Browse by Category',
    pageDescription:
      'Compare licensed casinos grouped by payout speed, game type and the player-protection features they offer.',
    // Meta-description tail for a single category page. Category records are
    // shared master data, so this is what keeps the four sites distinct there.
    categoryMetaSuffix: 'each one checked for licensing, withdrawal limits and responsible-play tools before listing.',
    noResults: 'No categories to show yet.',
  },
  newsletter: {
    title: 'Stay on the safe side',
    subtitle: 'Occasional updates on verified casinos and offers with terms worth reading.',
    placeholder: 'Your email address',
    button: 'Subscribe',
    success: 'Thanks! Check your inbox to confirm your address and finish signing up.',
    error: 'That did not go through. Please try again.',
  },
  footer: {
    // Short brand blurb in the footer, above the legal links.
    tagline:
      'An independent guide to casinos that treat players fairly. Check the terms, set a limit — 18+.',
    // Registered postal address, shown beside the copyright line. A physical
    // address in the footer is what mailbox providers and the gambling
    // affiliate compliance checks both look for, and it must match the address
    // used in the email templates.
    postalAddress: '25 Makariou III Avenue, Nicosia 1065, Cyprus',
    disclaimer:
      'Gambling should stay entertainment, never a way to make money. Strictly 18+. Set a limit before you play and walk away when you reach it. Some links on this site earn us a commission, which never influences a safety score.',
  },
  errors: {
    notFound: 'That page does not exist.',
    apiError: 'We could not load this content. Please try again shortly.',
  },
} as const
