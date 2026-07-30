import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "../../_shell/MarketingShell";
import { getAllPosts, getPost, formatPostDate } from "@/lib/blog";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  /* Article structured data — the same reason the landing page's FAQ carries
     JSON-LD: it's what turns a page into something an answer engine will
     quote with attribution. */
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "snapp" },
    publisher: { "@type": "Organization", name: "snapp" },
  };

  return (
    <MarketingShell anchors={false}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <article className="lp-article">
        <Link href="/blog" className="lp-back">
          ← All writing
        </Link>
        <p className="lp-eyebrow">{post.topic ?? "Writing"}</p>
        <h1 className="lp-h1 lp-article-h1">{post.title}</h1>
        <p className="lp-post-date">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        </p>
        {/* Markdown from content/blog — repo content, never user input. */}
        <div
          className="lp-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        <div className="lp-article-cta">
          <Link href="/signup" className="lp-btn lp-btn-primary">
            Start saving free
          </Link>
          <p className="lp-hero-note">
            Free forever for bookmarking · No card required
          </p>
        </div>
      </article>
    </MarketingShell>
  );
}
