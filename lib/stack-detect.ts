// Cheap site-stack detector. Fetches the homepage and looks for headers + HTML
// fingerprints. Best-effort, never blocks site creation: if it fails or the
// site is offline, we just store null and try again on first dashboard view.

export type Stack =
  | "nextjs"
  | "vercel"
  | "shopify"
  | "wordpress"
  | "webflow"
  | "framer"
  | "wix"
  | "squarespace"
  | "ghost"
  | "cloudflare-pages"
  | "unknown";

export type StackInfo = {
  stack: Stack;
  // Friendly name for the dashboard badge.
  label: string;
  // Whether server-side middleware-style crawler detection is feasible on the
  // platform (Next.js / Cloudflare / Node) vs HTML-only (Shopify / Webflow /
  // Wix / Framer / Squarespace).
  serverSideAvailable: boolean;
};

const STACK_LABELS: Record<Stack, string> = {
  nextjs: "Next.js",
  vercel: "Vercel",
  shopify: "Shopify",
  wordpress: "WordPress",
  webflow: "Webflow",
  framer: "Framer",
  wix: "Wix",
  squarespace: "Squarespace",
  ghost: "Ghost",
  "cloudflare-pages": "Cloudflare Pages",
  unknown: "Unknown",
};

const SERVER_SIDE_AVAILABLE: Record<Stack, boolean> = {
  nextjs: true,
  vercel: true,
  "cloudflare-pages": true,
  ghost: false,
  shopify: false,
  wordpress: false, // technically yes via PHP plugin, but treat as HTML-first
  webflow: false,
  framer: false,
  wix: false,
  squarespace: false,
  unknown: false,
};

export function describeStack(stack: Stack): StackInfo {
  return {
    stack,
    label: STACK_LABELS[stack],
    serverSideAvailable: SERVER_SIDE_AVAILABLE[stack],
  };
}

const FETCH_TIMEOUT_MS = 5000;
const UA = "OcholensBot/1.0 (+https://beam.dev/bot)";

// Try HTTPS first, fall back to HTTP. Some hobby sites are HTTP-only.
async function fetchHome(
  domain: string,
): Promise<{ html: string; headers: Headers } | null> {
  for (const proto of ["https", "http"]) {
    try {
      const res = await fetch(`${proto}://${domain}/`, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": UA, accept: "text/html,*/*" },
      });
      if (!res.ok && res.status >= 500) continue;
      const html = await res.text();
      return { html, headers: res.headers };
    } catch {
      // try next proto
    }
  }
  return null;
}

export async function detectStack(domain: string): Promise<Stack> {
  const fetched = await fetchHome(domain);
  if (!fetched) return "unknown";

  const { html, headers } = fetched;
  const lower = html.toLowerCase();

  const h = (name: string) => headers.get(name)?.toLowerCase() ?? "";

  // ── Header fingerprints first (cheapest, most reliable) ───────────────────
  const xPoweredBy = h("x-powered-by");
  const server = h("server");

  if (h("x-shopid") || h("x-shopify-stage") || h("x-shardid")) return "shopify";
  if (xPoweredBy.includes("next.js") || h("x-nextjs-cache")) return "nextjs";
  if (xPoweredBy.includes("wordpress") || xPoweredBy.includes("php")) {
    // PHP doesn't mean WordPress, but check body to confirm.
    if (
      lower.includes("/wp-content/") ||
      lower.includes("/wp-includes/") ||
      /<meta\s+name=["']generator["']\s+content=["']wordpress/i.test(html)
    ) {
      return "wordpress";
    }
  }
  if (h("x-vercel-id") || h("x-vercel-cache") || server.includes("vercel")) {
    // Vercel can host Next.js, Astro, Hugo, etc. Treat as Next.js if HTML
    // confirms, else generic Vercel (still server-side friendly).
    if (lower.includes("__next_data__") || lower.includes("/_next/static/")) {
      return "nextjs";
    }
    return "vercel";
  }
  if (server.includes("ghost")) return "ghost";

  // ── Generator meta tag ────────────────────────────────────────────────────
  const generator = html.match(
    /<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/i,
  );
  if (generator) {
    const g = generator[1].toLowerCase();
    if (g.includes("wordpress")) return "wordpress";
    if (g.includes("shopify")) return "shopify";
    if (g.includes("webflow")) return "webflow";
    if (g.includes("wix")) return "wix";
    if (g.includes("squarespace")) return "squarespace";
    if (g.includes("ghost")) return "ghost";
    if (g.includes("framer")) return "framer";
  }

  // ── HTML body fingerprints ────────────────────────────────────────────────
  if (lower.includes("__next_data__") || lower.includes("/_next/static/"))
    return "nextjs";
  if (lower.includes("cdn.shopify.com") || lower.includes("shopify.com/s/"))
    return "shopify";
  if (lower.includes("/wp-content/") || lower.includes("/wp-includes/"))
    return "wordpress";
  if (lower.includes("framerusercontent.com") || lower.includes("/framer-"))
    return "framer";
  if (lower.includes("assets.webflow.com") || lower.includes("webflow.io"))
    return "webflow";
  if (
    lower.includes("static.parastorage.com") ||
    lower.includes("wixstatic.com") ||
    lower.includes("wix.com")
  )
    return "wix";
  if (
    lower.includes("static1.squarespace.com") ||
    lower.includes("sqsp.net") ||
    lower.includes("squarespace.com")
  )
    return "squarespace";

  // Cloudflare Pages serves with cf-ray and no other vendor markers — last
  // resort because cf-ray also fronts other origins.
  if (headers.get("cf-ray") && !headers.get("x-powered-by")) {
    return "cloudflare-pages";
  }

  return "unknown";
}
