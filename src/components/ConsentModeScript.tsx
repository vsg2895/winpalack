/**
 * Google Consent Mode v2 defaults — every storage type DENIED.
 *
 * WHY THIS IS A RAW INLINE SCRIPT and not `next/script`. The consent default
 * must be in the dataLayer BEFORE gtag.js evaluates, or the tag's first act is
 * to write `_ga` and send a page_view — the exact thing consent is meant to
 * prevent. `next/script` cannot promise that ordering for a script the browser
 * must run synchronously during HTML parse, and `@next/third-parties` exposes no
 * consent prop. So GA still loads through `<GoogleAnalytics>`; only this
 * six-line bootstrap is hand-written, and it renders ABOVE it in the document.
 *
 * The same `dangerouslySetInnerHTML` pattern is already used in this layout for
 * the JSON-LD block.
 *
 * `security_storage` is the one grant: it covers fraud prevention and
 * authentication, carries no analytics or advertising identifier, and denying it
 * buys no privacy.
 *
 * `wait_for_update: 500` tells the tag to hold hits for 500ms while the bridge
 * reads localStorage and calls `consent: update`. Without it a returning visitor
 * who already accepted would lose the first page_view of every session to a race
 * between the tag and the update.
 *
 * A RETURNING visitor's stored choice is applied here too, inline, rather than
 * waiting for React to hydrate — the same race, one navigation wide.
 *
 * This runs on every request but is inert without `<Analytics>`: it only
 * populates dataLayer, and nothing reads it unless the GA tag loads.
 */

// Kept in step with CookieConsent's own constants. A mismatch would silently
// grant consent from a record the banner considers stale, so they are asserted
// against each other in ConsentMode.test-free fashion: the banner re-prompts on
// a version bump, and this reads the same version before honouring a choice.
const STORAGE_KEY = 'cookie-consent'
const CONSENT_VERSION = 1

const SNIPPET = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (raw) {
      var saved = JSON.parse(raw);
      if (saved && saved.v === ${CONSENT_VERSION} && saved.choice === 'all') {
        gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
          functionality_storage: 'granted',
          personalization_storage: 'granted'
        });
      }
    }
  } catch (e) { /* storage blocked — stay denied */ }
})();
`

export default function ConsentModeScript() {
  return <script id="consent-mode" dangerouslySetInnerHTML={{ __html: SNIPPET }} />
}
