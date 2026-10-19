import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /**
   * HSTS — one year, subdomains included.
   *
   * Sent from the app rather than from nginx so it ships with the build and
   * cannot be forgotten on a new domain. That is safe even though the header is
   * only meaningful over TLS: RFC 6797 §8.1 requires a browser to IGNORE a
   * Strict-Transport-Security header received over plain http, so an http
   * response carrying it changes nothing, and by the time a response reaches a
   * visitor over https this is exactly the header we want on it.
   *
   * It is what makes the http → https redirect a one-time cost: after the first
   * https response, the browser rewrites `http://<host>/…` to https ITSELF,
   * before a request is made, so the redirect in lib/seo/redirects.ts stops
   * being reached at all for returning visitors.
   *
   * `includeSubDomains` is deliberate and is the part to think about before
   * adding a new subdomain: every one of them must then be reachable over
   * https, or it becomes unreachable for anyone who has seen this header. If
   * nginx already sets HSTS on its https server block, remove it from one side
   * or the other — two identical headers are harmless but untidy, and two
   * DIFFERENT max-ages are a real source of confusion.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  // Option B URL consolidation: /categories/<slug> is the canonical home of a
  // category. The old query-parameter form is 301'd there so the two stop
  // competing as duplicates and the clean path keeps the ranking signal.
  // Unmatched query params (page=) are forwarded by Next automatically, so
  // /casinos?category=slots&page=3 lands on /categories/slots?page=3.
  /*
   * NO `redirects()` HERE, deliberately.
   *
   * The /casinos?category=<slug> → /categories/<slug> rule used to live here
   * and has moved to src/lib/seo/redirects.ts, applied by src/proxy.ts. Two
   * reasons, both measured rather than assumed:
   *
   * 1. A config redirect APPENDS every query parameter to its destination, the
   *    ones the destination already consumed included. This rule therefore
   *    redirected to /categories/<slug>?category=<slug> — a URL that then needed
   *    a SECOND redirect to clean itself up. Two hops for one move.
   * 2. Config redirects are evaluated BEFORE middleware, so this one pre-empted
   *    the canonical rules and nothing could be folded into a single hop.
   *
   * A config redirect also cannot REMOVE a query parameter — a `?page=1`
   * stripping rule written here would have `page=1` re-appended to its own
   * destination and redirect to itself forever. Middleware is the only layer
   * that can do it, so all the canonical rules belong in one place: that one.
   */
  // Emit a self-contained server at .next/standalone (minimal server.js + only
  // the traced node_modules) so the Docker runner image stays small and doesn't
  // need `next start` or a full install. See the Dockerfile.
  output: "standalone",
  // Pin the file-tracing root to THIS folder. Otherwise the parent monorepo
  // lockfile makes Next infer casino-platform/ as the root and nest the output
  // at .next/standalone/sites/idevaffiliation/server.js (breaking the Docker
  // `node server.js` path) and emit the "inferred workspace root" warning.
  outputFileTracingRoot: projectRoot,
  images: {
    // The casino/offer images are served by the Laravel storage backend. In
    // local dev that is http://localhost:8000 — a private IP, which Next 16
    // refuses to optimize by default (SSRF protection). Opt in for dev/private
    // networks. In production these are served from a public domain/CDN.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // Allow logos/banners from the storage backend or a CDN.
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
