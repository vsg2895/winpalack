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

// Idev Affiliation design: light "glass" review row with an emerald→teal rank chip.
export default function CasinoCard({ casino, rank }: { casino: CasinoWithAttachment; rank?: number }) {
  const logo = resolveImageUrl(casino.image_path)

  return (
    <li className="group relative flex flex-col items-start gap-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_-12px_rgba(79,70,229,0.35)] sm:flex-row sm:items-center">
      {rank != null && (
        <span className="absolute -left-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-sm font-bold text-white shadow-md sm:static sm:h-11 sm:w-11 sm:flex-shrink-0 sm:text-base">
          {rank}
        </span>
      )}

      <div className="flex-shrink-0">
        {logo ? (
          <Image src={logo} alt={`${casino.name} logo`} width={60} height={60} className="rounded-xl object-contain ring-1 ring-slate-100" />
        ) : (
          <span className="grid h-[60px] w-[60px] place-items-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-lg font-bold text-emerald-700" aria-label={casino.name}>
            {casino.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-tight text-slate-900">{casino.name}</h3>
        <div className="mt-1 flex items-center gap-2">
          <Stars rating={casino.rating} />
          <span className="text-xs font-medium text-slate-400">{casino.rating.toFixed(1)}</span>
        </div>
        {casino.bonuses && (
          <p className="mt-2 inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">{casino.bonuses}</p>
        )}
        {casino.categories && casino.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {casino.categories.map((c) => (
              <span key={c.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{c.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link href={`/casinos/${casino.slug}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700">
          {COPY.casinos.readReview}
        </Link>
        <a href={casino.attachment.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03]">
          {COPY.casinos.visitCasino}
        </a>
      </div>
    </li>
  )
}
