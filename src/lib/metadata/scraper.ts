import ogs from "open-graph-scraper";
import { URLMetadata } from "@/types";

export async function scrapeMetadata(url: string): Promise<URLMetadata> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace(/^www\./, "");

  try {
    const { result } = await ogs({
      url,
      timeout: 10000,
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; Snapp/1.0; +https://snapp.app)",
        },
      },
    });

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
