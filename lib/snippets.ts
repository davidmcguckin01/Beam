// Generates the install snippets shown in the install card. Each snippet has
// the customer's apiKey baked in.
//
// When a stack is detected (via lib/stack-detect.ts), we promote the matching
// tab to the front and surface a "Detected: X" badge in the UI.

import { BOTS_REGEX_SOURCE } from "./bots";
import type { Stack } from "./stack-detect";

export type SnippetKey =
  | "pixel"
  | "nextjs"
  | "cloudflare"
  | "node"
  | "shopify"
  | "wordpress"
  | "webflow"
  | "framer"
  | "wix"
  | "squarespace";

export type SnippetTab = {
  key: SnippetKey;
  label: string;
  lang: "html" | "ts" | "js" | "php" | "txt";
  body: string;
  blurb: string;
};

function pixelHtml(appUrl: string, apiKey: string) {
  return `<script async src="${appUrl}/p.js" data-site="${apiKey}"></script>
<noscript><img src="${appUrl}/api/i?s=${apiKey}&c=1" width="1" height="1" alt=""></noscript>`;
}

function nextjsBody(appUrl: string, apiKey: string) {
  return `// middleware.ts (or proxy.ts on Next 16+)
// Beam — server-side AI crawler detection.

const AI_BOTS = /${BOTS_REGEX_SOURCE}/i;
const SITE = "${apiKey}";
const INGEST = "${appUrl}/api/i";

export default async function middleware(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (AI_BOTS.test(ua)) {
    fetch(INGEST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        s: SITE,
        ua,
        url: req.url,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        country: req.headers.get("x-vercel-ip-country"),
      }),
    }).catch(() => {});
  }
}

export const config = {
  matcher: "/((?!_next|favicon.ico|.*\\\\..*).*)",
};`;
}

function cloudflareBody(appUrl: string, apiKey: string) {
  return `// Cloudflare Worker — Route worker on the customer's domain.
// Catches every request before it reaches origin.

const AI_BOTS = /${BOTS_REGEX_SOURCE}/i;
const SITE = "${apiKey}";
const INGEST = "${appUrl}/api/i";

export default {
  async fetch(request, _env, ctx) {
    const ua = request.headers.get("user-agent") || "";
    if (AI_BOTS.test(ua)) {
      ctx.waitUntil(
        fetch(INGEST, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            s: SITE,
            ua,
            url: request.url,
            ip: request.headers.get("cf-connecting-ip"),
            country: request.cf?.country,
            asn: request.cf?.asn,
          }),
        }).catch(() => {})
      );
    }
    return fetch(request);
  },
};`;
}

function nodeBody(appUrl: string, apiKey: string) {
  return `// Express / Connect / Node middleware. Drop in early in your stack.

const AI_BOTS = /${BOTS_REGEX_SOURCE}/i;
const SITE = "${apiKey}";
const INGEST = "${appUrl}/api/i";

function beamMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  if (AI_BOTS.test(ua)) {
    fetch(INGEST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        s: SITE,
        ua,
        url: req.originalUrl || req.url,
        ip:
          (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
          req.socket?.remoteAddress,
      }),
    }).catch(() => {});
  }
  next();
}

module.exports = { beamMiddleware };
// app.use(beamMiddleware);`;
}

function shopifyBody(appUrl: string, apiKey: string) {
  return `<!--
  Where to paste:
    Online Store → Themes → Edit code → layout/theme.liquid
    Find the closing </head> tag and paste this directly above it.
-->
${pixelHtml(appUrl, apiKey)}`;
}

function wordpressBody(appUrl: string, apiKey: string) {
  return `<?php
/*
  Where to paste (easiest): use the "WPCode" or "Insert Headers and Footers"
  plugin, then paste the <script>/<noscript> block into the Site Header
  section. Skip the PHP below in that case.

  Otherwise add this to your theme's functions.php:
*/

add_action('wp_head', function () {
  echo '<script async src="${appUrl}/p.js" data-site="${apiKey}"></script>' . "\\n";
  echo '<noscript><img src="${appUrl}/api/i?s=${apiKey}&c=1" width="1" height="1" alt=""></noscript>';
});`;
}

function webflowBody(appUrl: string, apiKey: string) {
  return `<!--
  Where to paste:
    Project Settings → Custom Code → Head Code

  Note: Webflow doesn't support server-side middleware, so crawler-only
  bots that don't render HTML won't appear. The <noscript> image catches
  bots that do parse HTML (most major crawlers).
-->
${pixelHtml(appUrl, apiKey)}`;
}

function framerBody(appUrl: string, apiKey: string) {
  return `<!--
  Where to paste:
    Site Settings → General → Custom Code → Start of <head>

  Note: Framer is HTML-only. Server-side crawler detection isn't available.
-->
${pixelHtml(appUrl, apiKey)}`;
}

function wixBody(appUrl: string, apiKey: string) {
  return `<!--
  Where to paste:
    Settings → Custom Code → + Add Custom Code → Head
    (Custom code requires a Wix Premium plan.)

  Note: Wix is HTML-only. Server-side crawler detection isn't available.
-->
${pixelHtml(appUrl, apiKey)}`;
}

function squarespaceBody(appUrl: string, apiKey: string) {
  return `<!--
  Where to paste:
    Settings → Advanced → Code Injection → Header

  Note: Squarespace is HTML-only. Server-side crawler detection isn't available.
-->
${pixelHtml(appUrl, apiKey)}`;
}

// Catalog of every snippet, in canonical order. The install card filters &
// reorders based on the detected stack.
function allTabs(appUrl: string, apiKey: string): SnippetTab[] {
  return [
    {
      key: "pixel",
      label: "JS pixel",
      lang: "html",
      blurb:
        "Catches human referrals from chatgpt.com / claude.ai / etc. Works on any site.",
      body: pixelHtml(appUrl, apiKey),
    },
    {
      key: "nextjs",
      label: "Next.js",
      lang: "ts",
      blurb:
        "Catches AI training + search crawlers (GPTBot, ClaudeBot) — they never run JS.",
      body: nextjsBody(appUrl, apiKey),
    },
    {
      key: "cloudflare",
      label: "Cloudflare",
      lang: "js",
      blurb:
        "Best coverage. Sits in front of origin so every crawler hit is captured.",
      body: cloudflareBody(appUrl, apiKey),
    },
    {
      key: "node",
      label: "Express / Node",
      lang: "js",
      blurb: "For Node backends not on Next.js or behind Cloudflare.",
      body: nodeBody(appUrl, apiKey),
    },
    {
      key: "shopify",
      label: "Shopify",
      lang: "html",
      blurb: "Paste into theme.liquid → above </head>.",
      body: shopifyBody(appUrl, apiKey),
    },
    {
      key: "wordpress",
      label: "WordPress",
      lang: "php",
      blurb: "WPCode/Insert-Headers plugin, or wp_head hook.",
      body: wordpressBody(appUrl, apiKey),
    },
    {
      key: "webflow",
      label: "Webflow",
      lang: "html",
      blurb: "Project Settings → Custom Code → Head Code.",
      body: webflowBody(appUrl, apiKey),
    },
    {
      key: "framer",
      label: "Framer",
      lang: "html",
      blurb: "Site Settings → Custom Code → Start of <head>.",
      body: framerBody(appUrl, apiKey),
    },
    {
      key: "wix",
      label: "Wix",
      lang: "html",
      blurb: "Settings → Custom Code → Head (Premium plan).",
      body: wixBody(appUrl, apiKey),
    },
    {
      key: "squarespace",
      label: "Squarespace",
      lang: "html",
      blurb: "Settings → Advanced → Code Injection → Header.",
      body: squarespaceBody(appUrl, apiKey),
    },
  ];
}

// Stacks → recommended primary tab + which platform-specific tab to surface.
const STACK_PRIMARY: Partial<Record<Stack, SnippetKey>> = {
  nextjs: "nextjs",
  vercel: "nextjs",
  "cloudflare-pages": "cloudflare",
  shopify: "shopify",
  wordpress: "wordpress",
  webflow: "webflow",
  framer: "framer",
  wix: "wix",
  squarespace: "squarespace",
};

// Stacks where server-side middleware *isn't* an option — hide those tabs.
const STACK_HIDE_SERVERSIDE = new Set<Stack>([
  "shopify",
  "wordpress",
  "webflow",
  "framer",
  "wix",
  "squarespace",
  "ghost",
]);

export function buildSnippets(opts: {
  appUrl: string;
  apiKey: string;
  stack?: Stack | null;
}): SnippetTab[] {
  const { appUrl, apiKey, stack } = opts;
  const all = allTabs(appUrl, apiKey);
  const primary = stack ? STACK_PRIMARY[stack] : undefined;
  const hideServer = stack ? STACK_HIDE_SERVERSIDE.has(stack) : false;

  // Filter: always include pixel + primary; include server-side options only
  // when relevant; include other platform tabs only when none was detected.
  const keep = (t: SnippetTab): boolean => {
    if (t.key === "pixel") return true;
    if (primary && t.key === primary) return true;
    // Server-side templates: keep unless stack is HTML-only platform.
    if (t.key === "nextjs" || t.key === "cloudflare" || t.key === "node") {
      return !hideServer;
    }
    // Other platform-specific tabs: only show when nothing detected.
    if (!stack || stack === "unknown") return true;
    return false;
  };

  const filtered = all.filter(keep);

  // Reorder: primary first, then pixel, then the rest in original order.
  return filtered.sort((a, b) => {
    const aRank = a.key === primary ? 0 : a.key === "pixel" ? 1 : 2;
    const bRank = b.key === primary ? 0 : b.key === "pixel" ? 1 : 2;
    return aRank - bRank;
  });
}
