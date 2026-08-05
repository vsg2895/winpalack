import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Option B URL consolidation: /categories/<slug> is the canonical home of a
  // category. The old query-parameter form is 301'd there so the two stop
  // competing as duplicates and the clean path keeps the ranking signal.
  // Unmatched query params (page=) are forwarded by Next automatically, so
  // /casinos?category=slots&page=3 lands on /categories/slots?page=3.
  async redirects() {
    return [
      {
        source: "/casinos",
        has: [{ type: "query" as const, key: "category", value: "(?<category>[^&]+)" }],
        destination: "/categories/:category",
        permanent: true,
      },
    ];
  },
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
