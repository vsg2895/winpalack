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
    countries: 'Countries',
    forum: 'Forum',
    guides: 'Guides',
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
    pageTitle: 'Licence & Safety Checks',
    pageDescription:
      'Licensed casinos assessed for withdrawal limits, complaint history and the safer-play tools they give players.',
    // Meta-description fallback for a casino review page. Casino records are
    // GLOBAL master data shared by every site, so without a per-site line here
    // all four domains would ship the identical description for the same casino.
    // Short per-site tail appended to an ADMIN-ENTERED casino meta description.
    // Casino records are shared by every site, so without this the same
    // description would ship on all four domains the moment the field is filled.
    // Appended to og:title / twitter:title on a casino review. The casino's
    // own meta_title is shared master data, so without this every domain
    // shipped an IDENTICAL share-card title for the same casino.
    // H2 over the offers block on a casino page. The literal 'Special Offers'
    // was hardcoded in the component on all six sites — an identical H2 on
    // every review page in the network.
    offersHeading: 'Offers Worth Claiming',
    // Tail of the summary-panel H2: `{casino.name} the safety checks`.
    glanceHeadingTail: 'safety record',
    reviewTitleTail: 'Licence & Limits Checked',
    reviewSignature: 'Licence and payout limits verified.',
    reviewSummary: 'checked for licensing, withdrawal limits and the safer-play tools it gives players.',
    visitCasino: 'Go To Casino',
    readReview: 'Read Safety Review',
    rating: 'Safety Score',
    // Reads off `casino.updated_at`, which the API already returns and which
    // until now only reached JSON-LD as `dateModified`. A visible revision date
    // is the cheapest trust signal a review page has — it says the entry is
    // maintained, not abandoned.
    // Reads off `updated_at`, which bumps on ANY field change — so it is
    // labelled as what it is. The editorial claim is reviewedOn below, which
    // comes from a date a person actually set.
    lastChecked: 'Entry updated',
    // Reads off `casinos.reviewed_at`. Only rendered when someone recorded a
    // real review date; never falls back to updated_at.
    reviewedOn: 'Checked by',
    methodologyLink: 'How we check casinos',
    // Rendered from the PER-SITE `attachment.featured` pivot flag, so the same
    // casino can be a pick here and an ordinary listing on another domain.
    // Editorial control lives in the admin: Casino → Attach to Sites → Featured.
    featuredBadge: 'Our pick',
    // Heading over the casino's promoted offer — `featured_special_offer_id` on
    // the casino record, chosen in the admin.
    featuredOfferHeading: 'The offer we would take',
    // Heading over the country chips on a casino page. Links into the
    // /countries hub, which is itself per-site switchable in the admin.
    countriesHeading: 'Accepts players from',
    // Heading/title tail for the per-operator bonus sub-page. Published only
    // when the operator has 2+ live offers AND admin-written intro copy.
    bonusesTitleTail: 'Bonuses & Offers',
    bonusesLink: 'See all bonuses',
    // Operator profile block — the licence, payment, support and safer-play
    // facts. Rendered only for the groups that actually have values.
    profileHeadingTail: 'in detail',
    profileIntro: 'Stated by the operator and checked against its licence where one is published. Blank fields are ones we have not verified.',
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
  countries: {
    pageTitle: 'Casinos By Country',
    pageDescription:
      'Find licensed casinos that accept players from your country, with the same licensing and payout checks applied everywhere on this site.',
    // Meta-description tail for a single country page. Country records are
    // shared master data, so this is what keeps the sites distinct there.
    countryMetaSuffix:
      'each one checked for licensing, withdrawal limits and responsible-play tools before listing.',
    showCasinos: 'Show Casinos',
    noResults: 'No countries to show yet.',
    emptyCountry: 'No casinos listed for this country yet.',
    casinoCount: (n: number) => `${n} ${n === 1 ? 'casino' : 'casinos'}`,
  },
  guides: {
    pageTitle: 'Guides',
    pageDescription:
      'Plain explanations of the terms that decide what a bonus is actually worth, and what to check before you deposit.',
    // Shown on every guide. A guide may link to an operator, and a reader is
    // entitled to know how the site is paid.
    affiliateDisclosure:
      'Some links on this page are affiliate links. If you sign up through one we may be paid a commission, at no cost to you. It never changes which casinos we list or what we say about them.',
    backToIndex: 'All guides',
  },
  // The forum — every published player review on the site, grouped by casino.
  //
  // ONLY the strings that are not editable in the admin panel live here. The
  // heading, eyebrow, intro, empty state and both meta strings come from
  // Sites → Forum page and are defaulted server-side (SiteForum::resolved), so
  // duplicating them here would create a second source of truth that an editor
  // could not see or change.
  //
  // What remains is number formatting: labels whose text is inseparable from a
  // count, where a free-text field would let an editor write a plural that
  // disagrees with the figure beside it.
  forum: {
    // Title Case, written into the strings rather than applied with a
    // `capitalize` utility: the class would also capitalise anything an editor
    // later interpolated, and these read as labels on a stat card, not sentences.
    statReviews: (n: number) => `${n} ${n === 1 ? 'Review' : 'Reviews'}`,
    statCasinos: (n: number) => `Across ${n} ${n === 1 ? 'Casino' : 'Casinos'}`,
    statAverage: (avg: number) => `${avg.toFixed(1)} Average Rating`,
    lastActivity: 'Last Review',
    readAll: (n: number) => `Read All ${n} ${n === 1 ? 'Review' : 'Reviews'}`,
    writeOne: 'Write A Review',
    threadRating: (avg: number, total: number) =>
      `${avg.toFixed(1)}/5 From ${total} ${total === 1 ? 'Review' : 'Reviews'}`,
  },
  reviews: {
    heading: 'Player Reviews',
    empty: 'No reviews yet — be the first to share your experience.',
    formTitle: 'Write A Review',
    formIntro: 'Your review appears on this page as soon as you post it.',
    nameLabel: 'Your name',
    emailLabel: 'Email (optional, never published)',
    ratingLabel: 'Rating',
    titleLabel: 'Headline (optional)',
    bodyLabel: 'Your review',
    bodyPlaceholder: 'What was your experience — payouts, support, verification?',
    submit: 'Submit Review',
    // Two outcomes, because the site can run pre- or post-moderation
    // (Sites -> Publish reviews immediately). The API reports which one
    // applied; promising the wrong one is a promise the page then breaks.
    success: 'Thanks — your review is now live. Scroll up to see it.',
    successPending: 'Thanks — your review has been submitted and will appear once approved.',
    error: 'That did not send. Please check the form and try again.',
    ratingSummary: (avg: number, total: number) =>
      `${avg.toFixed(1)} out of 5 from ${total} ${total === 1 ? 'review' : 'reviews'}`,
  },
  newsletter: {
    title: 'Stay on the safe side',
    subtitle: 'Occasional updates on verified casinos and offers with terms worth reading.',
    placeholder: 'Your email address',
    button: 'Subscribe',
    // Shown while the address is being checked. The subscribe request now
    // waits on a live address-validation call, so the button has to say so
    // rather than just dimming for a second or two.
    checking: 'Checking…',
        // The spam line is NOT optional wording. This is a double opt-in list: an
    // unconfirmed subscriber never receives anything again, and the verify mail
    // is the single most likely message to be filtered — new sender, one link,
    // no history. Telling people where to look is the difference between a
    // signup and a dead row.
    success:
      'Thanks! Check your inbox to confirm your address and finish signing up. '
      + 'No email? Check your spam or junk folder.',
    // Shown when the API reports email_sent=false — the site is still
    // collecting addresses but its sending is switched off in the admin.
    // Promising an inbox (and a spam folder to search) for mail that will
    // never arrive is worse than not collecting the address at all.
    successNoEmail:
      "You're on the list. No confirmation email is being sent from this site right now.",
    error: 'That did not send. Check the address and try once more.',
  },
  footer: {
    // Short brand blurb in the footer, above the legal links.
    //
    // KEEP THIS UNDER ~72 CHARACTERS. The footer's brand column is
    // (1152 - 32 padding - 40 gap) / 2 = 540px at the sm: breakpoint where the
    // grid becomes two columns, and the text renders at 14px — about 77
    // characters to a line. Anything longer wraps to a second line, which is
    // what this wording was trimmed to fix. It still wraps on a phone, where a
    // single column is ~340px; that is unavoidable for any real sentence and is
    // the correct behaviour there.
    tagline:
      'An independent guide to casinos that treat players fairly — 18+.',
    // Registered postal address, shown beside the copyright line. A physical
    // address in the footer is what mailbox providers and the gambling
    // affiliate compliance checks both look for, and it must match the address
    // used in the email templates.
    postalAddress: '25 Regent Street, London SW1Y 4PH, United Kingdom',
    disclaimer:
      'Gambling should stay entertainment, never a way to make money. Strictly 18+. Set a limit before you play and walk away when you reach it. Some links on this site earn us a commission, which never influences a safety score.',
  },
  errors: {
    notFound: 'That page does not exist.',
    apiError: 'We could not load this content. Please try again shortly.',
  },
} as const
