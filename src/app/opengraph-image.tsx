import { ImageResponse } from 'next/og'

/**
 * Dynamic Open Graph / Twitter card image.
 *
 * Until now no og:image existed anywhere while twitter:card was set to
 * `summary_large_image`, so every share of these pages rendered as an empty
 * card — the single most visible SEO/social gap on the site. Generating it here
 * means it can never drift out of sync with the site name, and needs no binary
 * asset committed to the repo.
 *
 * Next.js picks this file up automatically for every route that does not
 * override it, and injects the absolute og:image/twitter:image URLs plus the
 * width/height and alt text that crawlers expect.
 */
export const alt = 'Winpalack — Responsible Casino Guide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 10, opacity: 0.85, textTransform: 'uppercase' }}>
          Responsible Casino Guide
        </div>
        <div style={{ fontSize: 104, fontWeight: 700, marginTop: 24, textAlign: 'center', padding: '0 60px' }}>
          Winpalack
        </div>
        <div style={{ fontSize: 34, marginTop: 32, opacity: 0.8 }}>
          18+ · Gamble responsibly
        </div>
      </div>
    ),
    size,
  )
}
