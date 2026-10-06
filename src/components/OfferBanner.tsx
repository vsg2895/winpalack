import Image from 'next/image'

/**
 * A bonus banner shown WHOLE, on the backdrop every bonus block shares.
 *
 * Banner artwork arrives at whatever ratio the operator drew it at — most are
 * far wider than the boxes they land in here. `object-cover` cropped that
 * mismatch away, taking the edges off art meant to be read end to end, and the
 * browser's default `fill` stretched it instead, distorting the logo and the
 * figure on it. `object-contain` keeps the artwork intact, at the cost of
 * letterbox bands.
 *
 * ONE BACKDROP FOR EVERY BONUS, from `/bonus-backdrop.webp`. The bands were
 * briefly filled with a blurred copy of each bonus's own artwork, which made
 * every card a different colour and a grid of them read as a jumble. A single
 * image behind all of them turns the backdrop into the frame — the part that
 * stays put — and leaves the artwork as the only thing that differs from card
 * to card. Swapping that one file in `public/` restyles every bonus block on
 * the site; it is site chrome, so each site owns its own copy.
 *
 * Rendered even when a bonus has no artwork at all, so an offer awaiting its
 * banner sits in the same frame as the rest instead of in an empty grey box.
 *
 * CARDS ONLY. The single-bonus page shows its banner on nothing — there is no
 * set for it to belong to there, and the gold ground would only compete with
 * the one piece of artwork the page exists to show.
 *
 * Drop it into any `relative overflow-hidden` box: the box owns the aspect
 * ratio, this owns what happens inside it.
 */
export default function OfferBanner({
  src,
  alt,
  sizes,
  priority = false,
  zoomOnHover = false,
}: {
  /** The bonus's own artwork. Absent leaves the shared backdrop on its own. */
  src?: string | null
  alt: string
  sizes: string
  priority?: boolean
  /** Card use: the artwork lifts on hover, the backdrop stays put. */
  zoomOnHover?: boolean
}) {
  return (
    <>
      {/* A CSS background rather than a second <Image>: it is decoration, the
          same few KB on every card, and the browser fetches and decodes it
          once for the whole page instead of once per bonus. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[url('/bonus-backdrop.webp')] bg-cover bg-center"
      />
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-contain object-center${zoomOnHover ? ' transition-transform duration-300 group-hover:scale-105' : ''}`}
        />
      )}
    </>
  )
}
