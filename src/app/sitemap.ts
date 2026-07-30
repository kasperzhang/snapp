import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.usesnapp.app";

// Only the public, indexable pages: the marketing landing, the /for/* topic
// pages, the auth entry points, and the legal pages. Everything behind auth (/app, /mix, /settings)
// is excluded here and blocked in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    // Long-form landing surfaces — the pages meant to be found by search.
    { path: "/for/vibe-coding", priority: 0.8, changeFrequency: "monthly" },
    { path: "/for/cursor", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticRoutes = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Posts carry their own publish date as lastModified, so a crawler can tell
  // which ones are new without re-reading every page.
  const posts = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...posts];
}
