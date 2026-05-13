// Cryptographically tie a request IP to the vendor's published IP ranges.
// "Verified" means the IP is in a CIDR block the vendor publishes; "unverified"
// means the UA matched but we can't prove it isn't a spoof.
//
// Supports IPv4 today. IPv6 returns false (TODO).
//
// Cache: in-memory, per worker instance, 24h. For Vercel Edge that's per
// region/instance — good enough; the JSONs are small (<5KB) and rarely change.

import { BOTS, type Bot } from "./bots";

type IpCacheEntry = { ranges: string[]; expiresAt: number };
const ipCache = new Map<string, IpCacheEntry>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function getIpRanges(jsonUrl: string): Promise<string[]> {
  const now = Date.now();
  const cached = ipCache.get(jsonUrl);
  if (cached && cached.expiresAt > now) return cached.ranges;

  try {
    const res = await fetch(jsonUrl, {
      // Use the platform fetch cache so multiple instances share. 24h.
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return cached?.ranges ?? [];
    const data = await res.json();
    const prefixes: { ipv4Prefix?: string; ipv6Prefix?: string }[] =
      data?.prefixes ?? [];
    const ranges = prefixes
      .map((p) => p.ipv4Prefix || p.ipv6Prefix)
      .filter((r): r is string => !!r);
    ipCache.set(jsonUrl, { ranges, expiresAt: now + ONE_DAY_MS });
    return ranges;
  } catch {
    return cached?.ranges ?? [];
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (bits === 0) return true;
  const mask = ((~0 << (32 - bits)) >>> 0) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// Some forwarded-for headers contain "client, proxy1, proxy2". Take the first.
function firstIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

export async function verifyBotIp(
  bot: Bot,
  ipRaw: string | null | undefined
): Promise<boolean> {
  if (!bot.ipJsonUrl) return false; // vendor doesn't publish — can't verify
  const ip = firstIp(ipRaw);
  if (!ip) return false;
  if (ip.includes(":")) return false; // IPv6 not supported yet
  const ranges = await getIpRanges(bot.ipJsonUrl);
  if (ranges.length === 0) return false;
  return ranges.some((r) => ipv4InCidr(ip, r));
}

// Prefetch all published JSONs once at server startup if you want to warm the
// cache. Optional — fetches happen lazily on first verify of each vendor.
export async function warmBotIpCache(): Promise<void> {
  const urls = Array.from(
    new Set(BOTS.map((b) => b.ipJsonUrl).filter((u): u is string => !!u))
  );
  await Promise.all(urls.map((u) => getIpRanges(u)));
}
