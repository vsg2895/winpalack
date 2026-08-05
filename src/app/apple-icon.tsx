import { ImageResponse } from 'next/og'

/**
 * Apple touch icon, generated as a real PNG.
 *
 * The metadata previously pointed `apple` at icon.svg, which Apple does not
 * support — iOS silently fell back to a screenshot of the page. 180x180 is the
 * size Apple asks for.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
          color: '#ffffff',
          fontSize: 104,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        W
      </div>
    ),
    size,
  )
}
