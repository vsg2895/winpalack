'use client'

import { useState } from 'react'
import Link from 'next/link'
import OfferBanner from '@/components/OfferBanner'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { SpecialOffer } from '@shared/types/specialOffer'

const PER_PAGE = 4

/**
 * A casino's attached special offers, shown 4 at a time with the total count.
 * When there are more than 4, client-side pagination pages through them (the
 * offers already arrive with the casino, so no extra fetch is needed).
 */
export default function CasinoSpecialOffers({ offers }: { offers: SpecialOffer[] }) {
  const [page, setPage] = useState(0)

  // The API may serialize an empty relation as {} rather than []; guard for it
  // so a casino with no offers doesn't crash (offers.slice is not a function).
  const list = Array.isArray(offers) ? offers : []
  const total = list.length
  if (total === 0) return null

  const pageCount = Math.ceil(total / PER_PAGE)
  const start = page * PER_PAGE
  const visible = list.slice(start, start + PER_PAGE)

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="min-w-0 text-xl font-bold text-zinc-900">
          {COPY.casinos.offersHeading} <span className="font-semibold text-zinc-400">({total})</span>
        </h2>
        {pageCount > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:text-zinc-600"
            >
              ←
            </button>
            {/* `whitespace-nowrap`, and it is load-bearing: in a flex row next
                to a heading this is three tokens ("1", "/", "2"), and a long
                heading squeezed it into three stacked lines between the two
                arrows. The counter is one word, so it is told to behave like
                one. */}
            <span className="whitespace-nowrap text-sm tabular-nums text-zinc-500">{page + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="More offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:text-zinc-600"
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
              {/* The same frame the home page's bonus cards use — see
                  OfferBanner. These thumbnails sat on plain white, so a casino's
                  own offers read as a different kind of thing from the bonus
                  blocks everywhere else on the site; they are the same thing at
                  a smaller size.

                  Rendered unconditionally now: the backdrop IS the frame, so an
                  offer still waiting for its artwork keeps its place in the row
                  instead of collapsing the card to text. */}
              <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg">
                <OfferBanner src={thumb} alt={offer.title} sizes="112px" />
              </span>
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
