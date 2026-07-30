import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "../_shell/MarketingShell";
import { getAllPosts, formatPostDate } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — design for people building with AI",
  description:
    "Notes on giving coding agents taste: rules files that hold, what's worth borrowing from a website, and design vocabulary for people who never needed it before.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <MarketingShell anchors={false}>
      <div className="lp-article lp-blog-index">
        <p className="lp-eyebrow">Writing</p>
        <h1 className="lp-h1 lp-article-h1">
          Notes on giving an agent taste.
        </h1>
        <p className="lp-article-lede">
          Design vocabulary, reference workflows, and how to write rules an
          agent will still be following forty files later.
        </p>

        <ul className="lp-post-list">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="lp-post">
                <span className="lp-post-meta">
                  {p.topic && <span className="lp-post-topic">{p.topic}</span>}
                  <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                </span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
