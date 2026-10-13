import type { NextConfig } from "next";

/**
 * `EMBED_ALLOWED_ORIGINS` is a space separated list of sites that may embed
 * `/embed` in an iframe (for example: "https://example.com https://www.example.com").
 * When unset we fall back to `*`, which keeps local development and quick demos
 * working. Set it in production so only your own site can frame the app.
 */
const embedAncestors = process.env.EMBED_ALLOWED_ORIGINS?.trim() || "*";

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ChordDatabase is read from disk at runtime. Without this, Vercel omits
  // the markdowns from the serverless bundle and the live site would be empty.
  outputFileTracingIncludes: {
    "/api/library/database": ["./ChordDatabase/**/*"],
    "/songs/[id]": ["./ChordDatabase/**/*"],
    "/*": ["./ChordDatabase/**/*"],
  },
  async headers() {
    return [
      {
        // Everything except the embed route refuses to be framed.
        source: "/((?!embed).*)",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // The embed route is explicitly frameable by the configured origins.
        source: "/embed/:path*",
        headers: [
          ...baseSecurityHeaders,
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${embedAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
