import type { NextConfig } from "next";

/**
 * STEP 12: practical security headers for all responses.
 *
 * Deliberately NO Content-Security-Policy here: a broken CSP can destabilize
 * the Next.js runtime bundle and Recharts (inline styles/scripts), so headers
 * are limited to the low-risk, high-value set that never interferes with the
 * framework. The production host (Vercel) serves the site over HTTPS, and the
 * admin session cookie is marked `secure` in production by lib/auth/session.ts.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // frame-ancestors equivalent: refuse to render the app inside any frame.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

