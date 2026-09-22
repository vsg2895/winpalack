'use client'

import { openCookieSettings } from './CookieConsent'

// Footer link that reopens the cookie consent banner so visitors can review or
// withdraw consent at any time (GDPR best practice).
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-block -mx-1 px-1 py-3 -my-3 text-xs text-slate-400 transition-colors hover:text-emerald-700"
    >
      Cookie Settings
    </button>
  )
}
