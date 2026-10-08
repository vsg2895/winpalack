import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import CountryStrip from '@/components/CountryStrip'
import { COPY } from '@/constants/copy'
import type { CasinoWithAttachment } from '@shared/types/casino'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber-400' : 'text-slate-200'} aria-hidden>★</span>
      ))}
    </span>
  )
}

// Winpalack — minimalist review row: an elegant rank numeral, a prominent brand
// logo, then only the three things that matter (name · rating · bonus) and a
// clear primary CTA. No rank chip, no category clutter.
//
// `large` is the home-page list: it runs the full 90rem measure, so the row
// gets more padding, a taller minimum and a bigger logo on desktop. Listing
// pages keep the default so their narrower column does not feel padded out.
export default function CasinoCard({
  casino,
  rank,
  large = false,
  compact = false,
  flagsShown,
}: {
  casino: CasinoWithAttachment
  rank?: number
  large?: boolean
  /**
   * Country flags to show before the rest collapse into "+N", or `null` for all.
   *
   * Undefined on every card surface, which means CountryStrip's own default of
   * ten — the home strip, the listing and a category page all show the same
   * card, so they show the same number.
   */
  flagsShown?: number | null
  /**
   * The card is in a NARROW column — the home page's two-up grid, where a card
   * is about half the measure it gets on a listing page.
   *
   * Four side-by-side columns (logo · text · countries · buttons) do not fit in
   * that width: the text column is what gives, and the bonus line truncated to
   * "500 $…" while the country heading crowded the name. Compact drops the
   * countries out of the ROW and puts them under the bonus instead, which hands
   * the text column back about 190px — enough for a full bonus line.
   */
  compact?: boolean
}) {
  // Card shows the casino's "Image" (logo), NOT the wide "Banner Image" (that's
  // used big on the single casino page). Falls back to the banner if no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  return (
    /*
     * The row/stack switch is a CONTAINER query, not a viewport one.
     *
     * It used to be `sm:flex-row` — 640px of VIEWPORT. That was fine while this
     * card always spanned the full measure, and wrong the moment the home page
     * put two of them side by side: at 1100px the viewport says "row" while the
     * card itself is only 508px wide, so the name wrapped into the buttons and
     * the bonus truncated to "10.0 E…".
     *
     * `@container` + `@[600px]` asks the question that actually matters — is
     * THIS CARD wide enough for four columns — so the same component lays out
     * correctly at full width, at half width, and on a phone, with no caller
     * having to tell it which.
     */
    <li className="@container group">
      <div
        className={`flex h-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_18px_-10px_rgba(15,23,42,0.2)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_20px_44px_-18px_rgba(5,150,105,0.45)] ${
          compact
            ? '@[540px]:flex-row @[540px]:items-center @[540px]:gap-4 @[540px]:p-4'
            : '@[600px]:min-h-36 @[600px]:flex-row @[600px]:items-center @[600px]:gap-6 @[600px]:p-5'
        } ${large ? 'lg:min-h-44 lg:gap-8 lg:p-7' : ''}`}
      >
      {/*
        * Stacked compact cards put the rank+logo BESIDE the text, not above
        * it. On its own line the logo cost ~100px of height and was most of
        * why a half-width card came out nearly twice as tall as the
        * full-width one it replaced.
        *
        * `@[540px]:contents` dissolves this wrapper the moment the card is
        * wide enough to be a row, so the original three-column flex layout is
        * completely unaffected above that width.
        *
        * BELOW 340px of card, though, beside is wrong: a 144px logo out of a
        * 288px card leaves ~70px of text, which clipped "Luckydreams" mid-word
        * and pushed the rating off the card. Under that width the logo goes
        * back above the text, exactly as the full-width card has always done on
        * a phone. 340px is the measured threshold — a 375px viewport gives a
        * 343px card, which is where beside starts fitting.
        */}
      <div
        className={
          compact
            ? 'flex flex-col gap-3 @[340px]:flex-row @[340px]:items-center @[340px]:gap-4 @[540px]:contents'
            : 'contents'
        }
      >
      {/* Rank numeral + prominent logo */}
      <div className={`flex items-center ${compact ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-4'}`}>
        {rank != null && (
          <span
            className={`shrink-0 bg-gradient-to-br from-emerald-600 to-teal-500 bg-clip-text text-center font-display font-bold leading-none tabular-nums text-transparent ${
              compact
                ? 'w-5 text-lg sm:w-6 sm:text-xl'
                : 'w-6 text-2xl sm:w-8 sm:text-[2rem]'
            }`}
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
        )}
        {/* The logo opens the review, exactly as "Read Safety Review" does.
            It is the first thing a reader aims at on a card, and it led
            nowhere.

            `aria-hidden` + `tabIndex={-1}`: the casino name below is a link to
            the same page, so this would otherwise be a second tab stop and a
            second announcement of one destination. Hidden from the keyboard and
            from assistive tech, live for the pointer — the standard treatment
            for a card image that duplicates its title link. */}
        <Link
          href={`/casinos/${casino.slug}`}
          aria-hidden
          tabIndex={-1}
          className="block flex-shrink-0"
        >
          {image ? (
            // Directly-sized image (NO `fill`) → renders at exactly 160×96.
            <Image
              src={image}
              alt={casino.name}
              width={320}
              height={192}
              sizes={large ? '(min-width: 1024px) 192px, 160px' : compact ? '176px' : '160px'}
              className={`rounded-xl ring-1 ring-slate-100 ${compact ? 'h-24 w-36 @[540px]:h-[6.5rem] @[540px]:w-44' : 'h-24 w-40'} ${large ? 'lg:h-28 lg:w-48' : ''}`}
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-bold text-emerald-700 ${compact ? 'h-24 w-36 @[540px]:h-[6.5rem] @[540px]:w-44' : 'h-24 w-40'} ${large ? 'lg:h-28 lg:w-48' : ''}`} aria-label={casino.name}>
              {casino.name.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
      </div>

      {/* The three things that matter */}
      <div className="min-w-0 flex-1">
        {/* Per-site editorial promotion. `attachment.featured` has been in the
            API payload all along and was read by nothing, so a featured casino
            looked identical to every other row. Toggled per site in the admin,
            which is why it sits on the attachment and not on the casino. */}
        {casino.attachment.featured && (
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <span aria-hidden>◆</span>
            {COPY.casinos.featuredBadge}
          </p>
        )}
        {/* The name is the card's real link to the review — the one a keyboard
            reaches and a screen reader announces. */}
        <h3 className={`font-display text-lg font-bold leading-tight text-slate-900 sm:text-xl ${large ? 'lg:text-2xl' : ''}`}>
          <Link
            href={`/casinos/${casino.slug}`}
            className="rounded transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            {casino.name}
          </Link>
        </h3>
        {/* WRAPS. In a compact card on a 320px screen the text column is ~100px
            and the stars alone are 88px, so "5.0" beside them had nowhere to go
            and left the card — invisible, because the body clips rather than
            scrolls. It drops under the stars at that one size and sits beside
            them everywhere else. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Stars rating={casino.rating} />
          <span className="text-sm font-semibold text-slate-400">{casino.rating.toFixed(1)}</span>
        </div>
        {casino.bonuses && (
          <p className="mt-2 line-clamp-2 text-[15px] font-bold text-emerald-700">{casino.bonuses}</p>
        )}
        {/* Compact only. `showHeading` is off because the column is narrow and
            "ACCEPTS PLAYERS FROM" above a row of flags costs a line to say what
            the flags already say here. */}
        {compact && (
          <div className="mt-2">
            <CountryStrip countries={casino.countries ?? []} showHeading={false} limit={flagsShown} />
          </div>
        )}
      </div>

      </div>

      {/* Its own column, in the gap the card already had between the bonus and
          the buttons. That space was doing nothing, and the alternative — a
          fourth line under the bonus — pushed the card taller on every row.
          On mobile the card stacks, so this simply falls between the two.

          In a compact card it is rendered inside the text column instead (see
          above): at half the width the row cannot carry four columns. */}
      {! compact && (
        <div className="@[600px]:flex-shrink-0 @[600px]:pr-2">
          <CountryStrip countries={casino.countries ?? []} limit={flagsShown} />
        </div>
      )}

      {/* CTAs — Visit is primary, Read Review secondary */}
      {/*
        * Side by side while the card is stacked, stacked once it is a row.
        *
        * In a half-width card the two CTAs are what decide the height: full
        * width each, they add ~100px of button to a card that is already
        * taller for being stacked. Next to each other they cost one row, and
        * the card stays about the height of the full-width version — which is
        * the point, since the ask was two per row and NOT bigger cards.
        */}
      <div
        className={`flex w-full gap-2 ${
          compact
            ? 'flex-row @[540px]:w-auto @[540px]:flex-col @[540px]:flex-shrink-0'
            : 'flex-col @[600px]:w-auto @[600px]:flex-shrink-0'
        }`}
      >
        {/* Through our own /go route, not the operator URL: the destination
            is admin-editable and the click is counted. rel/target are unchanged
            — the link is still sponsored and still opens in a new tab. */}
        <a
          href={`/go/${casino.slug}`}
          target="_blank"
          rel="nofollow sponsored noopener"
          className={`rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-[1.03] @[600px]:px-6 @[600px]:min-w-[150px] ${compact ? 'flex-1 @[540px]:flex-none @[540px]:min-w-[132px]' : ''}`}
        >
          {COPY.casinos.visitCasino}
        </a>
        <Link
          href={`/casinos/${casino.slug}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 @[600px]:px-6 ${compact ? 'flex-1 @[540px]:flex-none' : ''}`}
        >
          {COPY.casinos.readReview}
        </Link>
        </div>
      </div>
    </li>
  )
}
