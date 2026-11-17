'use client'

import { openCookieSettings } from './CookieConsent'

// Footer link that reopens the cookie consent banner so visitors can review or
// withdraw consent at any time (GDPR best practice).
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-flex min-h-11 min-w-11 items-center text-xs text-slate-400 transition-colors hover:text-emerald-700 lg:text-sm"
    >
      Cookie Settings
    </button>
  )
}
