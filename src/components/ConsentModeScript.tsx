/**
 * Google Consent Mode v2 defaults — every storage type GRANTED.
 *
 * MODE: CONSENT_NON_BLOCKING. The cookie banner is still rendered and still
 * records the visitor's choice, but analytics no longer waits for it: the tag
 * is granted from the first paint, on every page load, for every visitor.
 *
 * This is a deliberate operator decision, not an oversight. It is recorded here
 * because the previous version of this file denied all six categories and the
 * difference is one word per line — anyone reading it later should see that the
 * grant is intentional rather than a mistake.
 *
 * WHAT THIS MEANS IN PRACTICE: `_ga` is written on first load, before any
 * interaction with the banner, including for visitors in the EEA and the UK.
 * The Cookie Policy and Privacy Policy have been updated to describe this
 * accurately — if this file is ever changed back, those two pages have to move
 * with it or the site describes a practice it does not follow.
 *
 * `wait_for_update` is gone. It existed to hold hits for 500ms while a bridge
 * read localStorage and granted; with nothing to wait for, keeping it would
 * only delay the first page_view of every session.
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
  gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'granted',
    security_storage: 'granted'
  });
})();
`

export default function ConsentModeScript() {
  return <script id="consent-mode" dangerouslySetInnerHTML={{ __html: SNIPPET }} />
}
