import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

/* Posts are Markdown files in content/blog. Rendering them to plain HTML
   rather than to React components is deliberate: the .lp-article rules in the
   marketing stylesheet already style bare h2/p/ul/code, so a post inherits
   the article typography with no per-element mapping to maintain.

   The HTML is injected with dangerouslySetInnerHTML, which is safe here and
   only here — the source is Markdown committed to this repo, never user
   input. Don't reuse this helper for anything a user can write. */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  /** ISO date; drives ordering and the <time> element. */
  date: string;
  /** Optional short label shown above the title, e.g. "Working with agents". */
  topic?: string;
}

export interface Post extends PostMeta {
  html: string;
}

function readPost(file: string): { meta: PostMeta; body: string } {
  const slug = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");

  let data: Record<string, unknown>;
  let content: string;
  try {
    ({ data, content } = matter(raw));
  } catch (e) {
    // Frontmatter is YAML, so a description starting with a quote or
    // containing an unescaped colon fails to parse. Name the file — the raw
    // YAML error points at a line number with no indication of which post.
    throw new Error(
      `content/blog/${file} has invalid frontmatter: ${(e as Error).message}`
    );
  }

  if (!data.title || !data.description || !data.date) {
    throw new Error(
      `content/blog/${file} is missing title, description or date in its frontmatter`
    );
  }

  return {
    meta: {
      slug,
      title: String(data.title),
      description: String(data.description),
      date: new Date(String(data.date)).toISOString(),
      topic: data.topic ? String(data.topic) : undefined,
    },
    body: content,
  };
}

/** Every post, newest first. */
export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readPost(f).meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** One post with its body rendered, or null when the slug doesn't exist. */
export async function getPost(slug: string): Promise<Post | null> {
  const file = `${slug}.md`;
  if (!fs.existsSync(path.join(BLOG_DIR, file))) return null;
  const { meta, body } = readPost(file);
  return { ...meta, html: await marked.parse(body) };
}

/** "30 July 2026" — matches the plain, non-US style used on the legal pages.
    Formatted in UTC on purpose: a bare `2026-07-30` in frontmatter parses as
    UTC midnight, so rendering it in any behind-UTC zone shows the day before
    the one that was written. */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
