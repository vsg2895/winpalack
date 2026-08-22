import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Apple touch icon — the SAME artwork as public/icon.svg, at 180x180.
 *
 * It used to draw a single letter. That was wrong in a way that only showed up
 * in a real browser: Safari prefers the 180x180 apple-touch-icon over the .ico
 * and the .svg when choosing a TAB icon, so the letter — not the brand mark —
 * became what every visitor saw. Rather than fight that preference order, every
 * icon variant now renders the same source artwork, so whichever one a browser
 * picks it shows this site's mark.
 *
 * The SVG is read from disk and embedded, so it can never drift from the
 * favicon: edit public/icon.svg and all three variants follow. Evaluated at
 * build time (this route prerenders), so there is no per-request file read.
 *
 * The flat background is the icon's own rounded-rect fill. iOS masks this image
 * into a rounded square and composites anything transparent onto black, so
 * painting the brand colour edge to edge keeps the corners right.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const svg = readFileSync(join(process.cwd(), 'public', 'icon.svg'), 'utf8')

  // First <rect fill="…"> in the mark is its background plate.
  const background = /<rect[^>]*\bfill="(#[0-9a-fA-F]{3,8})"/.exec(svg)?.[1] ?? '#ffffff'
  const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- satori renders to PNG, not the DOM */}
        <img src={source} width={size.width} height={size.height} alt="" />
      </div>
    ),
    size,
  )
}
