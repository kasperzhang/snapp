// SSRF protection for server-side fetching of user-supplied URLs.
//
// The scan (headless Chromium) and metadata (OG scrape) routes fetch arbitrary
// URLs a user types in. Without validation, a user could point them at internal
// services (http://localhost:6379), cloud metadata (169.254.169.254), or
// private-network hosts. `assertPublicHttpUrl` enforces http(s) and resolves
// the host, rejecting any address in a private/loopback/link-local/reserved
// range.
//
// Checking the URL a user typed is not enough on its own: a public page can
// redirect to an internal one. `safeFetch` re-checks every hop, and the scanner
// runs the same guard on every request Chromium makes (see page-analyzer).
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
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast / reserved / broadcast
  return false;
}

/* Eight 16-bit groups, or null if the string isn't a well-formed address.
   Done by hand rather than by string prefix: Node's URL parser rewrites
   [::ffff:127.0.0.1] to [::ffff:7f00:1], so any check that looks for the
   dotted form is bypassed by the parser itself. */
function ipv6Groups(ip: string): number[] | null {
  let v = ip.toLowerCase().split("%")[0]; // drop a zone id
  const tail = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const o = tail[1].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    v =
      v.slice(0, -tail[1].length) +
      ((o[0] << 8) | o[1]).toString(16) +
      ":" +
      ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = v.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 2 ? fill < 1 : fill !== 0) return null;
  const groups = [...head, ...Array(Math.max(0, fill)).fill("0"), ...rest].map(
    (g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN)
  );
  return groups.some(Number.isNaN) ? null : groups;
}

function embeddedIPv4(g: number[], from: number): string {
  return [g[from] >> 8, g[from] & 0xff, g[from + 1] >> 8, g[from + 1] & 0xff].join(".");
}

function isPrivateIPv6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (!g) return true; // unparseable → unsafe

  const zeroUntil = (n: number) => g.slice(0, n).every((x) => x === 0);
  // ::/96 covers :: and ::1 as well as the deprecated IPv4-compatible form
  // (::7f00:1), which some stacks still route as IPv4.
  if (zeroUntil(6)) {
    if (g[6] === 0 && g[7] <= 1) return true;
    return isPrivateIPv4(embeddedIPv4(g, 6));
  }
  // ::ffff:0:0/96 — IPv4-mapped. Judge by the IPv4 address inside it.
  if (zeroUntil(5) && g[5] === 0xffff) return isPrivateIPv4(embeddedIPv4(g, 6));
  // ::ffff:0:0:0/96 — IPv4-translated (SIIT).
  if (zeroUntil(4) && g[4] === 0xffff && g[5] === 0) return true;
  if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64 (incl. 64:ff9b:1::/48)
  if (g[0] === 0x2002) return true; // 6to4 — embeds an arbitrary IPv4
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  if (g[0] === 0x2001 && g[1] === 0xdb8) return true; // documentation
  if (g[0] === 0x100 && zeroUntil(4)) return true; // discard-only 100::/64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}

export function isPrivateAddress(ip: string): boolean {
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

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, ""); // strip IPv6 brackets / trailing dot
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

const MAX_REDIRECTS = 5;

/**
 * `fetch` for user-supplied URLs. Follows redirects itself, running every hop
 * through `assertPublicHttpUrl` — `redirect: "follow"` would let a public URL
 * bounce the request to localhost or the metadata service unchecked.
 */
export async function safeFetch(
  raw: string,
  init: Omit<RequestInit, "redirect"> = {}
): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicHttpUrl(current);
    const res = await fetch(url, { ...init, redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    await res.body?.cancel();
    current = new URL(location, url).href;
  }
  throw new SsrfError("Too many redirects");
}
