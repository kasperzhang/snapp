import { Marked } from "marked";

/* Design guides come back from the model as markdown and were being printed
   into a <pre>, so people read "## Typography" and "**bold**" as literal
   characters. This turns them into a document.

   The text is escaped before it is parsed: marked passes raw HTML straight
   through to the page, and nothing a design guide needs to say requires
   markup. Entities survive the round trip, so "Color & Background" still
   reads as an ampersand and a <div> in a code fence still reads as a div. */
function escapeHtml(md: string) {
  return md.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* Escaping stops raw HTML, but markdown's own syntax can still carry a
   payload: marked writes [x](javascript:...) out as a live link, and the
   guide's text is partly shaped by whatever the scanned site said. So links
   keep only schemes a guide could mean, and images aren't rendered at all —
   a remote image would tell its owner the guide was opened. Browsers ignore
   whitespace and control characters inside a scheme ("java\tscript:"), so
   those are stripped before it's read. Entities need no handling here:
   escapeHtml already turned every & into &amp;. */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function isSafeHref(href: string): boolean {
  const scheme = href
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "")
    .match(/^([a-z][a-z0-9+.-]*:)/i)?.[1]
    ?.toLowerCase();
  return !scheme || SAFE_SCHEMES.has(scheme);
}

// Its own instance, so the blog (trusted, author-written) keeps marked's
// defaults.
const guideMarked = new Marked({
  renderer: {
    link(token) {
      if (isSafeHref(token.href)) return false; // marked's default rendering
      return this.parser.parseInline(token.tokens);
    },
    image(token) {
      return token.text;
    },
  },
});

/** Markdown as HTML, safe to hand to dangerouslySetInnerHTML. */
export function renderMarkdown(md: string): string {
  return guideMarked.parse(escapeHtml(md), { async: false }) as string;
}

export interface GuideSection {
  id: string;
  title: string;
  /** The markdown under this heading, heading line excluded. */
  body: string;
}

/* The guide is split on its "## " headings rather than rendered in one piece,
   so each section is a real element: something the contents rail can scroll
   to, and something with its own Copy button. The prompt asks for a known set
   of sections (see lib/guide-sections) but the split reads whatever actually
   arrived — a guide that came back short still renders. */
export function splitGuide(md: string): {
  preamble: string;
  sections: GuideSection[];
} {
  const lines = md.split("\n");
  const preamble: string[] = [];
  const sections: GuideSection[] = [];
  const seen = new Map<string, number>();
  let current: GuideSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) sections.push({ ...current, body: buffer.join("\n").trim() });
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading && !line.startsWith("###")) {
      flush();
      const title = heading[1].trim();
      const base = slugify(title) || "section";
      // Two sections can share a name; their anchors can't.
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      current = { id: n === 1 ? base : `${base}-${n}`, title, body: "" };
    } else if (current) {
      buffer.push(line);
    } else {
      preamble.push(line);
    }
  }
  flush();

  return { preamble: preamble.join("\n").trim(), sections };
}
