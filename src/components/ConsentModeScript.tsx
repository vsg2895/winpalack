import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from '@/lib/consent'

/**
 * Google Consent Mode v2 defaults — analytics DENIED until the visitor chooses
 * "Accept All" in the cookie banner.
 *
 * Replaces the earlier CONSENT_NON_BLOCKING mode, which granted every storage
 * type from the first paint and wrote `_ga` before any choice, for EEA and UK
 * visitors too. PECR and the GDPR need consent for analytics cookies, so:
 *
 *  - `analytics_storage` is granted only when the stored choice is "all" under
 *    the current CONSENT_VERSION. A returning visitor who accepted is measured
 *    in full from the first hit; nobody else gets a cookie.
 *  - The ad_* types are ALWAYS denied, Accept All included: the site sets no
 *    advertising cookies and the policies say so.
 *  - No choice, "Reject Non-Essential", a GPC signal (the banner does not ask,
 *    so no record is written) or blocked storage all leave it denied.
 *
 * ADVANCED Consent Mode: gtag.js still loads, and while denied it sends
 * cookieless pings with no client identifier — what GA uses to model the
 * traffic it cannot measure. The Cookie and Privacy policies describe this.
 * Mid-session choices go through `updateAnalyticsConsent` (lib/ga.ts).
 *
 * Still a raw inline script rather than `next/script`: consent state must be in
 * the dataLayer BEFORE gtag.js evaluates, and only a synchronous inline script
 * parsed above the loader can promise that ordering. The same
 * `dangerouslySetInnerHTML` pattern is used by the JSON-LD block in this layout.
 */
const SNIPPET = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  var accepted = false;
  try {
    var record = JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}) || 'null');
    accepted = !!record && record.v === ${CONSENT_VERSION} && record.choice === 'all';
  } catch (e) {}
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: accepted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
  gtag('set', 'ads_data_redaction', true);
})();
`

export default function ConsentModeScript() {
  return <script id="consent-mode" dangerouslySetInnerHTML={{ __html: SNIPPET }} />
}
