import type { MetadataRoute } from "next";

// The canonical host is www — the apex 308-redirects to it (Vercel), so every
// public URL and the sitemap reference points at www to avoid redirect hops.
const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.usesnapp.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in app surfaces and API routes carry no SEO value and shouldn't
      // be crawled.
      disallow: ["/app", "/mix", "/settings", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
