import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
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
export default function CasinoCard({ casino, rank }: { casino: CasinoWithAttachment; rank?: number }) {
  // Card shows the casino's "Image" (logo), NOT the wide "Banner Image" (that's
  // used big on the single casino page). Falls back to the banner if no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  return (
    <li className="group flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_18px_-10px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-18px_rgba(5,150,105,0.45)] sm:h-36 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      {/* Rank numeral + prominent logo */}
      <div className="flex items-center gap-3 sm:gap-4">
        {rank != null && (
          <span
            className="w-6 shrink-0 bg-gradient-to-br from-emerald-600 to-teal-500 bg-clip-text text-center font-display text-2xl font-bold leading-none tabular-nums text-transparent sm:w-8 sm:text-[2rem]"
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
        )}
        <div className="flex-shrink-0">
          {image ? (
            // Directly-sized image (NO `fill`) → renders at exactly 160×96.
            <Image
              src={image}
              alt={casino.name}
              width={320}
              height={192}
              className="h-24 w-40 rounded-xl ring-1 ring-slate-100"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span className="grid h-24 w-40 place-items-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-bold text-emerald-700" aria-label={casino.name}>
              {casino.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* The three things that matter */}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-bold leading-tight text-slate-900 sm:text-xl">{casino.name}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          <Stars rating={casino.rating} />
          <span className="text-sm font-semibold text-slate-400">{casino.rating.toFixed(1)}</span>
        </div>
        {casino.bonuses && (
          <p className="mt-2 line-clamp-2 text-[15px] font-bold text-emerald-700">{casino.bonuses}</p>
        )}
      </div>

      {/* CTAs — Visit is primary, Read Review secondary */}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-shrink-0">
        <a
          href={casino.attachment.affiliate_url}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-[1.03] sm:min-w-[150px]"
        >
          {COPY.casinos.visitCasino}
        </a>
        <Link
          href={`/casinos/${casino.slug}`}
          className="rounded-xl border border-slate-200 px-6 py-2.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
        >
          {COPY.casinos.readReview}
        </Link>
      </div>
    </li>
  )
}
