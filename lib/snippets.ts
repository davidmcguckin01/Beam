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
  | "squarespace"
  | "ai-prompt";

export type SnippetTab = {
  key: SnippetKey;
  label: string;
  lang: "html" | "ts" | "js" | "php" | "txt";
  body: string;
  // One-line "what does this catch / where does it go" subtitle shown above
  // the code block.
  blurb: string;
  // What to do with the snippet after copying it. Renders as Step 02.
  pasteInstruction: string;
  // Closing line. Renders as Step 03. Defaults to "Visit your site — events
  // arrive within seconds."
  doneInstruction?: string;
};

function pixelHtml(appUrl: string, apiKey: string) {
  return `<script async src="${appUrl}/p.js" data-site="${apiKey}"></script>
<noscript><img src="${appUrl}/api/i?s=${apiKey}&c=1" width="1" height="1" alt=""></noscript>`;
}

function nextjsBody(appUrl: string, apiKey: string) {
  return `// middleware.ts (or proxy.ts on Next 16+)
// Beam — server-side AI crawler detection.
import type { NextRequest, NextFetchEvent } from "next/server";

const AI_BOTS = /${BOTS_REGEX_SOURCE}/i;
const SITE = "${apiKey}";
const INGEST = "${appUrl}/api/i";

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const ua = req.headers.get("user-agent") || "";
  if (!AI_BOTS.test(ua)) return;

  // event.waitUntil keeps the edge function alive until the beacon resolves.
  // Without it the runtime can cancel the fetch the moment middleware returns.
  event.waitUntil(
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
    })
      .then((res) => {
        if (!res.ok) console.error("[beam] ingest failed:", res.status);
        else console.log("[beam] tracked", new URL(req.url).pathname);
      })
      .catch((err) => console.error("[beam] ingest error:", err))
  );
}

export const config = {
  // Match everything except Next internals — note this still covers
  // /robots.txt, /sitemap.xml and /llms.txt, where AI crawlers hit first.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
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
        })
          .then((res) => {
            if (!res.ok) console.error("[beam] ingest failed:", res.status);
            else console.log("[beam] tracked", new URL(request.url).pathname);
          })
          .catch((err) => console.error("[beam] ingest error:", err))
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
    })
      .then((res) => {
        if (!res.ok) console.error("[beam] ingest failed:", res.status);
        else console.log("[beam] tracked", req.originalUrl || req.url);
      })
      .catch((err) => console.error("[beam] ingest error:", err));
  }
  next();
}

module.exports = { beamMiddleware };
// app.use(beamMiddleware);`;
}

function aiPromptBody(opts: {
  appUrl: string;
  apiKey: string;
  stack: Stack | null | undefined;
  domain: string;
}) {
  const { appUrl, apiKey, stack, domain } = opts;
  const stackLabel =
    stack && stack !== "unknown" ? prettyStack(stack) : "(unknown — check the package.json / framework files in this repo)";

  const pixel = pixelHtml(appUrl, apiKey);

  // Add the most relevant middleware snippet inline so the AI tool has
  // everything it needs without extra round-trips.
  let middlewareBlock = "";
  if (stack === "nextjs" || stack === "vercel") {
    middlewareBlock = `\n\n3) Server-side crawler detection — create middleware.ts at the project root (or proxy.ts on Next 16+):

\`\`\`ts
${nextjsBody(appUrl, apiKey)}
\`\`\``;
  } else if (stack === "cloudflare-pages") {
    middlewareBlock = `\n\n3) Server-side crawler detection — deploy this as a Cloudflare Route Worker on this domain:

\`\`\`js
${cloudflareBody(appUrl, apiKey)}
\`\`\``;
  } else if (
    stack === "shopify" ||
    stack === "wordpress" ||
    stack === "webflow" ||
    stack === "framer" ||
    stack === "wix" ||
    stack === "squarespace"
  ) {
    middlewareBlock = `\n\n3) Skip server-side middleware — this site is on ${stackLabel}, which doesn't expose request middleware. The <noscript> image in step 1 catches the crawlers that render HTML.`;
  } else {
    middlewareBlock = `\n\n3) If this stack supports request middleware (Next.js, Express, Cloudflare Workers, etc.), also install request-level crawler detection. Match this UA regex:

\`\`\`
/${BOTS_REGEX_SOURCE}/i
\`\`\`

When matched, POST to ${appUrl}/api/i with the JSON body below. Important: register the fetch with the platform's background-task primitive (event.waitUntil / ctx.waitUntil) so the edge runtime doesn't cancel it the moment the handler returns — a bare fetch() silently drops. Also console.log on match so a broken install is visible in the deploy logs. And make sure the route matcher still covers /robots.txt, /sitemap.xml and /llms.txt — crawlers hit those first.
\`\`\`json
{ "s": "${apiKey}", "ua": "...", "url": "...", "ip": "...", "country": "..." }
\`\`\``;
  }

  return `You're installing Beam (an AI traffic analytics tool) on my ${stackLabel} site at ${domain}.

My Beam apiKey is: ${apiKey}
The Beam ingest endpoint is: ${appUrl}/api/i

Two things to install:

1) JS pixel — add this to my <head> tag on every page:

\`\`\`html
${pixel}
\`\`\`

2) Verify the snippet is rendered into <head> on every public page. For frameworks with a single layout file (Next.js app/layout.tsx, _document.tsx, theme.liquid, etc.), one place is enough.${middlewareBlock}

After installing, tell me exactly which files you changed and what to verify in the browser DevTools to confirm Beam is firing.`;
}

function shopifyBody(appUrl: string, apiKey: string) {
  return pixelHtml(appUrl, apiKey);
}

function wordpressBody(appUrl: string, apiKey: string) {
  return `<?php
// Add to your theme's functions.php — or use the WPCode plugin and paste
// the <script>/<noscript> block in step 1 directly into the Site Header.

add_action('wp_head', function () {
  echo '<script async src="${appUrl}/p.js" data-site="${apiKey}"></script>' . "\\n";
  echo '<noscript><img src="${appUrl}/api/i?s=${apiKey}&c=1" width="1" height="1" alt=""></noscript>';
});`;
}

function htmlOnlyBody(appUrl: string, apiKey: string) {
  return pixelHtml(appUrl, apiKey);
}

function allTabs(appUrl: string, apiKey: string, stack: Stack | null | undefined, domain: string): SnippetTab[] {
  return [
    {
      key: "pixel",
      label: "JS pixel",
      lang: "html",
      blurb:
        "Catches human referrals from chatgpt.com / claude.ai / etc. Works on any site.",
      body: pixelHtml(appUrl, apiKey),
      pasteInstruction:
        "Paste in your <head> on every page you want tracked.",
    },
    {
      key: "nextjs",
      label: "Next.js",
      lang: "ts",
      blurb:
        "Catches AI training + search crawlers (GPTBot, ClaudeBot) — they never run JS.",
      body: nextjsBody(appUrl, apiKey),
      pasteInstruction:
        "Save as middleware.ts (or proxy.ts on Next 16+) at your project root.",
    },
    {
      key: "cloudflare",
      label: "Cloudflare",
      lang: "js",
      blurb:
        "Best coverage — sits in front of origin so every crawler hit is captured.",
      body: cloudflareBody(appUrl, apiKey),
      pasteInstruction:
        "Deploy as a Route Worker on your domain in the Cloudflare dashboard.",
    },
    {
      key: "node",
      label: "Express / Node",
      lang: "js",
      blurb: "For Node backends not on Next.js or behind Cloudflare.",
      body: nodeBody(appUrl, apiKey),
      pasteInstruction:
        "Drop in early in your Express stack with app.use(beamMiddleware).",
    },
    {
      key: "shopify",
      label: "Shopify",
      lang: "html",
      blurb: "Pixel only — Shopify themes don't expose request middleware.",
      body: shopifyBody(appUrl, apiKey),
      pasteInstruction:
        "Online Store → Themes → Edit code → layout/theme.liquid → above </head>.",
    },
    {
      key: "wordpress",
      label: "WordPress",
      lang: "php",
      blurb: "Use the WPCode plugin (paste the JS pixel) or wp_head().",
      body: wordpressBody(appUrl, apiKey),
      pasteInstruction:
        "Add to your theme's functions.php, or paste the JS pixel via the WPCode plugin (Site Header).",
    },
    {
      key: "webflow",
      label: "Webflow",
      lang: "html",
      blurb: "Pixel only — Webflow doesn't expose request middleware.",
      body: htmlOnlyBody(appUrl, apiKey),
      pasteInstruction: "Project Settings → Custom Code → Head Code.",
    },
    {
      key: "framer",
      label: "Framer",
      lang: "html",
      blurb: "Pixel only — Framer is HTML-served.",
      body: htmlOnlyBody(appUrl, apiKey),
      pasteInstruction:
        "Site Settings → General → Custom Code → Start of <head>.",
    },
    {
      key: "wix",
      label: "Wix",
      lang: "html",
      blurb: "Pixel only — Wix is HTML-served (Premium plan required).",
      body: htmlOnlyBody(appUrl, apiKey),
      pasteInstruction:
        "Settings → Custom Code → + Add Custom Code → Head.",
    },
    {
      key: "squarespace",
      label: "Squarespace",
      lang: "html",
      blurb: "Pixel only — Squarespace is HTML-served.",
      body: htmlOnlyBody(appUrl, apiKey),
      pasteInstruction:
        "Settings → Advanced → Code Injection → Header.",
    },
    {
      key: "ai-prompt",
      label: "AI prompt",
      lang: "txt",
      blurb:
        "Paste this into Cursor / Claude Code / Copilot Chat in your project — it'll install Beam for you.",
      body: aiPromptBody({ appUrl, apiKey, stack, domain }),
      pasteInstruction:
        "Open your AI assistant inside the project and paste the prompt.",
      doneInstruction:
        "Let it edit the files, then refresh the dashboard.",
    },
  ];
}

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
  domain?: string;
}): SnippetTab[] {
  const { appUrl, apiKey, stack, domain = "your-site.com" } = opts;
  const all = allTabs(appUrl, apiKey, stack, domain);
  const primary = stack ? STACK_PRIMARY[stack] : undefined;
  const hideServer = stack ? STACK_HIDE_SERVERSIDE.has(stack) : false;

  const keep = (t: SnippetTab): boolean => {
    if (t.key === "pixel" || t.key === "ai-prompt") return true;
    if (primary && t.key === primary) return true;
    if (t.key === "nextjs" || t.key === "cloudflare" || t.key === "node") {
      return !hideServer;
    }
    if (!stack || stack === "unknown") return true;
    return false;
  };

  const filtered = all.filter(keep);

  // Order: detected platform first, then pixel, then everything else, then
  // AI prompt last (it's the "shortcut", not the primary path).
  return filtered.sort((a, b) => {
    const rank = (t: SnippetTab) => {
      if (t.key === primary) return 0;
      if (t.key === "pixel") return 1;
      if (t.key === "ai-prompt") return 9;
      return 5;
    };
    return rank(a) - rank(b);
  });
}

function prettyStack(stack: Stack): string {
  switch (stack) {
    case "nextjs":
      return "Next.js";
    case "vercel":
      return "Vercel";
    case "shopify":
      return "Shopify";
    case "wordpress":
      return "WordPress";
    case "webflow":
      return "Webflow";
    case "framer":
      return "Framer";
    case "wix":
      return "Wix";
    case "squarespace":
      return "Squarespace";
    case "ghost":
      return "Ghost";
    case "cloudflare-pages":
      return "Cloudflare Pages";
    default:
      return stack;
  }
}
