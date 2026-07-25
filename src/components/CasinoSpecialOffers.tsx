'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

const PER_PAGE = 4

/**
 * A casino's attached special offers, shown 4 at a time with the total count.
 * When there are more than 4, client-side pagination pages through them (the
 * offers already arrive with the casino, so no extra fetch is needed).
 */
export default function CasinoSpecialOffers({ offers }: { offers: SpecialOffer[] }) {
  const [page, setPage] = useState(0)

  const total = offers.length
  if (total === 0) return null

  const pageCount = Math.ceil(total / PER_PAGE)
  const start = page * PER_PAGE
  const visible = offers.slice(start, start + PER_PAGE)

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-zinc-900">
          Special Offers <span className="font-semibold text-zinc-400">({total})</span>
        </h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous offers"
              className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:text-zinc-600"
            >
              ←
            </button>
            <span className="text-sm tabular-nums text-zinc-500">{page + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="More offers"
              className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:text-zinc-600"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((offer) => {
          const thumb = resolveImageUrl(offer.image_path ?? offer.banner_image)
          return (
            <Link
              key={offer.id}
              href={`/special-offers/${offer.slug}`}
              className="group flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              {thumb && (
                <Image
                  src={thumb}
                  alt={offer.title}
                  width={112}
                  height={64}
                  className="h-16 w-28 shrink-0 rounded-lg bg-slate-50 object-contain object-center p-1"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900 group-hover:text-emerald-700">{offer.title}</span>
                {offer.bonuses && <span className="mt-1 block line-clamp-2 text-sm text-zinc-500">{offer.bonuses}</span>}
                <span className="mt-2 inline-block text-xs font-semibold text-emerald-600">View offer →</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
