import type { ReactNode } from 'react'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { Country } from '@shared/types/country'

/** How many flags are shown before the rest collapse into a counter. */
const FLAGS_SHOWN = 5

/**
 * Where a casino accepts players, as a compact strip of flags.
 *
 * Two very different cases, deliberately drawn differently rather than squeezed
 * into one treatment:
 *
 *  - WORLDWIDE is a single labelled pill. It is a stronger, simpler claim than
 *    any list of countries, so it gets words — a lone globe among rows of flags
 *    would read as just one more country.
 *
 *  - A COUNTRY LIST is an overlapping avatar stack capped at five, with the
 *    remainder as "+74". Six of these casinos are attached to all 79 countries;
 *    rendering 79 flags would bury the name, the rating and the bonus under a
 *    wall of 16px images. The stack is the established pattern for "a set too
 *    large to enumerate", and the overlap signals that it is a sample rather
 *    than the whole set.
 *
 * The flags are decorative and marked aria-hidden: to a screen reader a row of
 * small images says nothing useful, so the group carries one honest sentence
 * instead ("Accepts players from 79 countries, including …"). Each flag keeps a
 * `title` so a sighted user can hover to identify one.
 *
 * Plain <img>, not next/image: these are SVGs, and the optimizer refuses SVG
 * unless dangerouslyAllowSVG is enabled — which is not worth turning on to
 * resize an image that is already 16 pixels wide.
 */
export default function CountryStrip({
  countries,
  showHeading = true,
}: {
  countries: Country[]
  /**
   * Off where the surrounding markup already labels it — the casino page puts
   * this inside a <dl>, where a <p> caption would be invalid HTML and the <dt>
   * beside it already says the same words.
   */
  showHeading?: boolean
}) {
  if (!countries || countries.length === 0) return null

  /**
   * A caption above the flags, because the flags alone are ambiguous.
   *
   * Five small flags beside a bonus could as easily mean "licensed in",
   * "blocked in" or "currencies accepted". Three words remove the guess — and on
   * a page about where someone is allowed to play, that guess is the whole
   * point. Both variants share it, so the Worldwide pill and a country list read
   * as answers to the same question.
   */
  const withHeading = (content: ReactNode) => (
    showHeading ? (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {COPY.casinos.countriesHeading}
      </p>
      {content}
    </div>
    ) : content
  )

  const worldwide = countries.find((c) => c.slug === 'worldwide')

  if (worldwide) {
    const flag = resolveImageUrl(worldwide.image_path)

    return withHeading(
      <span
        /* h-[22px] matches the flag row, so a list mixing Worldwide casinos with
           per-country ones keeps one card height. */
        className="inline-flex h-[22px] w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
        role="img"
        aria-label={COPY.casinos.countriesWorldwideAria}
      >
        {flag ? (
          <img src={flag} alt="" width={14} height={14} className="h-3.5 w-3.5 rounded-full" aria-hidden />
        ) : (
          <span aria-hidden>🌐</span>
        )}
        {COPY.casinos.countriesWorldwide}
      </span>,
    )
  }

  const shown = countries.slice(0, FLAGS_SHOWN)
  const remaining = countries.length - shown.length

  return withHeading(
    <span
      className="flex h-[22px] items-center gap-2"
      role="img"
      aria-label={COPY.casinos.countriesAria(countries.length, shown.map((c) => c.name))}
    >
      {/* Separated, NOT overlapped.
          The avatar-stack pattern is wrong for flags: avatars are high-contrast
          portraits that stay recognisable when clipped, whereas flags are small
          low-contrast blocks of colour, and at 18px an overlap turned five of
          them into one indistinct smear. A 4px gap costs a few pixels of width
          and makes each one readable. */}
      <span className="flex items-center gap-1" aria-hidden>
        {shown.map((country) => {
          const flag = resolveImageUrl(country.image_path)

          return (
            <span
              key={country.id}
              title={country.name}
              className="relative inline-flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/10"
            >
              {flag ? (
                <img src={flag} alt="" className="h-full w-full object-cover" />
              ) : (
                // No uploaded flag: the ISO code is still recognisable, and an
                // empty circle would read as a loading state.
                <span className="text-[7px] font-bold uppercase text-slate-500">{country.code ?? '?'}</span>
              )}
            </span>
          )
        })}
      </span>

      {remaining > 0 && (
        <span
          className="inline-flex h-[18px] items-center rounded-full bg-slate-100 px-1.5 text-xs font-semibold tabular-nums text-slate-500"
          aria-hidden
        >
          {COPY.casinos.countriesMore(remaining)}
        </span>
      )}
    </span>,
  )
}
