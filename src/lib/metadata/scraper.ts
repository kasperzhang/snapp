import ogs from "open-graph-scraper";
import type { URLMetadata } from "@/types";
import { safeFetch } from "@/lib/security/ssrf";

// The head is all the scraper reads; a page larger than this is not worth
// holding in memory for it.
const MAX_HTML_BYTES = 1024 * 1024;

/* The page is fetched here and handed to ogs as a string, rather than letting
   ogs fetch it: ogs follows redirects without asking, so a public URL could
   bounce it to an internal address and the title would read that page back.
   safeFetch checks every hop. */
async function fetchHtml(url: string): Promise<string> {
  const res = await safeFetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Snapp/1.0; +https://snapp.app)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok || !res.body) {
    await res.body?.cancel();
    throw new Error(`HTTP ${res.status}`);
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  while (size < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});

  const charset =
    res.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1]?.trim() ??
    "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  return decoder.decode(Buffer.concat(chunks));
}

export async function scrapeMetadata(url: string): Promise<URLMetadata> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  try {
    const { result } = await ogs({ html: await fetchHtml(url) });

    const title = result.ogTitle || result.twitterTitle || domain;
    const description =
      result.ogDescription || result.twitterDescription || null;

    // Get favicon
    let favicon_url: string | null = null;
    if (result.favicon) {
      // Handle relative favicon URLs
      if (result.favicon.startsWith("//")) {
        favicon_url = `https:${result.favicon}`;
      } else if (result.favicon.startsWith("/")) {
        favicon_url = `${parsedUrl.protocol}//${parsedUrl.host}${result.favicon}`;
      } else if (result.favicon.startsWith("http")) {
        favicon_url = result.favicon;
      } else {
        favicon_url = `${parsedUrl.protocol}//${parsedUrl.host}/${result.favicon}`;
      }
    } else {
      // Fallback to Google's favicon service
      favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    // Get OG image
    let og_image_url: string | null = null;
    if (result.ogImage && result.ogImage.length > 0) {
      const ogImage = result.ogImage[0];
      if (ogImage.url) {
        if (ogImage.url.startsWith("//")) {
          og_image_url = `https:${ogImage.url}`;
        } else if (ogImage.url.startsWith("/")) {
          og_image_url = `${parsedUrl.protocol}//${parsedUrl.host}${ogImage.url}`;
        } else {
          og_image_url = ogImage.url;
        }
      }
    } else if (result.twitterImage && result.twitterImage.length > 0) {
      const twitterImage = result.twitterImage[0];
      if (twitterImage.url) {
        og_image_url = twitterImage.url;
      }
    }

    return {
      url,
      title,
      description,
      favicon_url,
      og_image_url,
      domain,
    };
  } catch (error) {
    console.error("Error scraping metadata:", error);
    // Return basic metadata on error
    return {
      url,
      title: domain,
      description: null,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      og_image_url: null,
      domain,
    };
  }
}
