/**
 * Frequently asked questions for this site.
 *
 * Rendered VISIBLY on the home page and emitted as FAQPage structured data from
 * this same array. Google requires the two to match; markup-only FAQ is a
 * guidelines violation, which is why the page maps over this constant rather
 * than duplicating the text.
 *
 * The wording is unique to this site: these answers are indexable page content,
 * and they are exactly the kind of text an answer engine quotes.
 */
export const FAQ_ITEMS = [
  {
    question: "What makes a casino verified on this site?",
    answer:
      "Before an operator is listed we confirm its licence is current, check the withdrawal limits published in its terms, and look for deposit limits, reality checks and self-exclusion tools. Anything failing those checks is not listed.",
  },
  {
    question: "Do you make money if I sign up?",
    answer:
      "Yes, some links earn us a commission. It has no bearing on whether an operator passes our checks. Payment cannot buy a listing, and it cannot stop us removing one.",
  },
  {
    question: "How do you handle complaints about an operator?",
    answer:
      "We track complaint history around slow or refused withdrawals. A pattern of unresolved complaints gets an operator removed from the list, and we explain why.",
  },
  {
    question: "What responsible-play tools should a casino offer?",
    answer:
      "At minimum: deposit limits you set yourself, a visible session timer, cooling-off periods and one-click self-exclusion. We note which of these each operator provides.",
  },
  {
    question: "Can I set limits before I start playing?",
    answer:
      "Yes, and you should. Every operator listed here lets you set a deposit limit at sign-up. Decide the number before your first deposit, not after a loss.",
  },
] as const
