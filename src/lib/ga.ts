/**
 * The GA4 measurement ID, resolved once at BUILD time.
 *
 * `NEXT_PUBLIC_*` is inlined by `next build`, so a value supplied only to the
 * running container never reaches the browser. The literal fallback exists for
 * exactly that case: without it a missing env var renders `G-undefined` into
 * every page, which looks like a working tag and silently collects nothing.
 *
 * There is no NODE_ENV guard. The tag loads in development too — that is
 * deliberate, so "does analytics work?" is answerable before deploying rather
 * than only after.
 */
export const GA_MEASUREMENT_ID: string = process.env.NEXT_PUBLIC_GA_ID || 'G-VSQ3RW8F7H'

declare global {
  interface Window {
    // Optional: the inline bootstrap defines it during parse, but a component
    // must not assume the script ran (an extension or a blocker can remove it).
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

// Build-time warning, not an error: the fallback keeps the build correct, but a
// missing variable usually means the deploy pipeline lost it, and that is worth
// seeing in the build log. `typeof window === 'undefined'` keeps it off the
// client bundle's execution path.
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_GA_ID) {
  console.warn(
    `[analytics] NEXT_PUBLIC_GA_ID is not set — falling back to the built-in ${GA_MEASUREMENT_ID}. ` +
      'NEXT_PUBLIC_* is inlined at build time, so pass it as a Docker --build-arg, not a runtime env var.',
  )
}
