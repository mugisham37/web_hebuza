import type { NextConfig } from "next";

// CSP starts report-only (F-SEC-04): enforce in Stage 15 after GA4/Flutterwave/Meet origins are confirmed.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com",
  "frame-src https://checkout.flutterwave.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, // F-SEC-01
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(self), payment=(self)" }, // camera/GPS for uploads & field check-in
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  // Dummy data (MSW) is on unless explicitly turned off, e.g. once NEXT_PUBLIC_API_URL points at the real backend.
  // Dummy data (MSW) only while no backend is configured: API_URL set → real API, proxied same-origin (cookies just work).
  env: { NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? (process.env.API_URL ? "off" : "on") },
  // Self-hosting (plan §3): standalone server, ≥2 instances. DEPLOYMENT_VERSION (e.g. the git SHA) pins asset/version-skew
  // handling; NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be the same on every instance (read from env by Next at build/run).
  output: "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION || undefined,
  // Auto-memoization; Rust port runs inside Turbopack, no babel plugin needed.
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 days; local assets are immutable
  },
  experimental: {
    authInterrupts: true, // unauthorized()/forbidden() from workspace guards
    // Signed-in shells hold children until the client session resolves; validate only segments that opt in via `instant`.
    instantInsights: { validationLevel: "manual-warning" },
    agentFeedback: true,
    turbopackRustReactCompiler: true,
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    // inlineCss off: the 184 KB stylesheet was copied into ~9.7k prerendered HTML+RSC files (2.1 GB image).
  },
  // /api/* → the NestJS API (../server), same-origin so httpOnly session cookies are first-party. Without API_URL the
  // browser's MSW worker answers /api/* with dummy data (src/mocks).
  async rewrites() {
    // Browsers probe /favicon.ico before the streamed <link rel=icon> arrives; serve the brand icon instead of a 404.
    const favicon = { source: "/favicon.ico", destination: "/orvena/brand/favicon.png" };
    return process.env.API_URL ? [favicon, { source: "/api/:path*", destination: `${process.env.API_URL}/api/:path*` }] : [favicon];
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/orvena/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" }, // Next PWA guide (Stage 9)
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
