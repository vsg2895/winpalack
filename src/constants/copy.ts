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
    metaDescription:
      'Online casinos checked for licensing, fair withdrawal limits and responsible-play tools before we recommend them to anyone.',
  },
  casinos: {
    pageTitle: 'Verified Casino Reviews',
    pageDescription:
      'Licensed casinos assessed for withdrawal limits, complaint history and the safer-play tools they give players.',
    visitCasino: 'Go to Casino',
    readReview: 'Read Safety Review',
    rating: 'Safety Score',
    noResults: 'No verified casinos match this filter yet.',
  },
  specialOffers: {
    pageTitle: 'Verified Casino Offers',
    pageDescription:
      'Bonuses with their wagering requirements and withdrawal caps stated up front, so nothing catches you out after you deposit.',
    claim: 'Claim Safely',
    noResults: 'No verified offers are running right now.',
  },
  categories: {
    pageTitle: 'Browse by Category',
    pageDescription:
      'Compare licensed casinos grouped by payout speed, game type and the player-protection features they offer.',
    noResults: 'No categories to show yet.',
  },
  newsletter: {
    title: 'Stay on the safe side',
    subtitle: 'Occasional updates on verified casinos and offers with terms worth reading.',
    placeholder: 'Your email address',
    button: 'Sign Up',
    success: 'Thanks! Check your inbox to confirm your address and finish signing up.',
    error: 'That did not go through. Please try again.',
  },
  footer: {
    disclaimer:
      'Gambling should stay entertainment, never a way to make money. Strictly 18+. Set a limit before you play and walk away when you reach it. Some links on this site earn us a commission, which never influences a safety score.',
  },
  errors: {
    notFound: 'That page does not exist.',
    apiError: 'We could not load this content. Please try again shortly.',
  },
} as const
