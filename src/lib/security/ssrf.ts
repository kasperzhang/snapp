// SSRF protection for server-side fetching of user-supplied URLs.
//
// The scan (headless Chromium) and metadata (OG scrape) routes fetch arbitrary
// URLs a user types in. Without validation, a user could point them at internal
// services (http://localhost:6379), cloud metadata (169.254.169.254), or
// private-network hosts. `assertPublicHttpUrl` enforces http(s) and resolves
// the host, rejecting any address in a private/loopback/link-local/reserved
// range.
//
// Caveat: DNS can still rebind between this check and the actual fetch
// (TOCTOU). This is a strong baseline; a hardened setup would also pin the
// resolved IP or fetch through an egress proxy with the same allowlist.

import { lookup } from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true; // loopback / unspecified
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
  if (v.startsWith("fe80")) return true; // link-local
  const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/); // IPv4-mapped
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format → unsafe
}

/**
 * Validate a user-supplied URL for safe server-side fetching. Returns the parsed
 * URL if safe; throws SsrfError otherwise.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http(s) URLs are allowed");
  }

  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new SsrfError("Host not allowed");
  }

  // IP literal → check directly; hostname → resolve all addresses and check each.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new SsrfError("URL resolves to a private address");
    }
    return url;
  }

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("Could not resolve host");
  }
  if (!addrs.length) throw new SsrfError("Could not resolve host");
  for (const a of addrs) {
    if (isPrivateAddress(a.address)) {
      throw new SsrfError("URL resolves to a private address");
    }
  }
  return url;
}
