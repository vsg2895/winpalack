/**
 * Where the cookie banner keeps the visitor's choice, shared by the banner
 * (CookieConsent, client) and the Consent Mode defaults (ConsentModeScript,
 * an inline script rendered on the server) — both must read the same record.
 *
 * Bump CONSENT_VERSION to re-prompt everyone after a material change to the
 * Cookie Policy: a record under an older version counts as no choice, so
 * analytics stays denied until the visitor answers again.
 */
export const CONSENT_STORAGE_KEY = 'cookie-consent'
export const CONSENT_VERSION = 1
