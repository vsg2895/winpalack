'use client'

import { openCookieSettings } from './CookieConsent'

// Footer link that reopens the cookie consent banner so visitors can review or
// withdraw consent at any time (GDPR best practice).
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-block py-1.5 -my-1.5 text-xs text-slate-400 transition-colors hover:text-emerald-700"
    >
      Cookie settings
    </button>
  )
}
