// LLM-era bot taxonomy. See the comprehensive reference doc for the why
// behind each entry. We intentionally categorize rather than dump a flat list —
// "AI training" vs "AI search" vs "AI user" matters for product UX.

export type BotCategory = "training" | "search" | "user" | "unknown";

export type Bot = {
  name: string; // Display name
  vendor: string; // 'openai' | 'anthropic' | 'google' | ...
  category: BotCategory;
  regex: RegExp;
  // Vendor's published IP ranges JSON. Present means we can verify the request
  // IP came from the vendor.
  ipJsonUrl?: string;
  // Suffix that reverse DNS should resolve to. Present means we can
  // forward-confirm via DNS (not implemented in edge runtime yet).
  reverseDnsSuffix?: string[];
};

// Ordered by specificity. More specific UA matches first so e.g. ChatGPT-User
// wins over a generic /bot/ pattern.
export const BOTS: Bot[] = [
  // OpenAI — three bots, all with published IP JSON
  {
    name: "GPTBot",
    vendor: "openai",
    category: "training",
    regex: /GPTBot/i,
    ipJsonUrl: "https://openai.com/gptbot.json",
  },
  {
    name: "OAI-SearchBot",
    vendor: "openai",
    category: "search",
    regex: /OAI-SearchBot/i,
    ipJsonUrl: "https://openai.com/searchbot.json",
  },
  {
    name: "ChatGPT-User",
    vendor: "openai",
    category: "user",
    regex: /ChatGPT-User/i,
    ipJsonUrl: "https://openai.com/chatgpt-user.json",
  },
  {
    name: "Operator",
    vendor: "openai",
    category: "user",
    regex: /Operator/i,
  },

  // Anthropic — no published IPs; verification unreliable. Match UA only.
  {
    name: "Claude-SearchBot",
    vendor: "anthropic",
    category: "search",
    regex: /Claude-SearchBot/i,
  },
  {
    name: "Claude-User",
    vendor: "anthropic",
    category: "user",
    regex: /Claude-User/i,
  },
  {
    name: "ClaudeBot",
    vendor: "anthropic",
    category: "training",
    regex: /ClaudeBot/i,
  },
  // Legacy strings still seen in logs
  {
    name: "anthropic-ai",
    vendor: "anthropic",
    category: "training",
    regex: /anthropic-ai/i,
  },
  {
    name: "claude-web",
    vendor: "anthropic",
    category: "training",
    regex: /claude-web/i,
  },
  {
    name: "claude-code",
    vendor: "anthropic",
    category: "user",
    regex: /claude-code/i,
  },

  // Perplexity — two bots, IP ranges published
  {
    name: "PerplexityBot",
    vendor: "perplexity",
    category: "search",
    regex: /PerplexityBot/i,
    reverseDnsSuffix: [".perplexity.ai"],
  },
  {
    name: "Perplexity-User",
    vendor: "perplexity",
    category: "user",
    regex: /Perplexity-User/i,
  },

  // Google — note Google-Extended is opt-out token only, won't appear in logs
  {
    name: "GoogleOther",
    vendor: "google",
    category: "training",
    regex: /GoogleOther/i,
    reverseDnsSuffix: [".googlebot.com", ".google.com"],
  },
  {
    name: "Google-NotebookLM",
    vendor: "google",
    category: "user",
    regex: /Google-NotebookLM/i,
  },
  {
    name: "Google-CloudVertexBot",
    vendor: "google",
    category: "user",
    regex: /Google-CloudVertexBot/i,
  },

  // Microsoft / Bing
  {
    name: "Bingbot",
    vendor: "microsoft",
    category: "search",
    regex: /bingbot/i,
    reverseDnsSuffix: [".search.msn.com"],
  },

  // Apple — Applebot-Extended is opt-out token, exclude it explicitly
  {
    name: "Applebot",
    vendor: "apple",
    category: "search",
    regex: /Applebot(?!-Extended)/i,
    reverseDnsSuffix: [".applebot.apple.com"],
  },

  // Meta
  {
    name: "meta-externalagent",
    vendor: "meta",
    category: "training",
    regex: /meta-externalagent/i,
  },
  {
    name: "meta-externalfetcher",
    vendor: "meta",
    category: "user",
    regex: /meta-externalfetcher/i,
  },
  {
    name: "facebookexternalhit",
    vendor: "meta",
    category: "user",
    regex: /facebookexternalhit/i,
  },

  // Others
  {
    name: "Bytespider",
    vendor: "bytedance",
    category: "training",
    regex: /Bytespider/i,
  },
  {
    name: "CCBot",
    vendor: "common-crawl",
    category: "training",
    regex: /CCBot/i,
  },
  {
    name: "MistralAI-User",
    vendor: "mistral",
    category: "user",
    regex: /MistralAI-User/i,
  },
  {
    name: "cohere-training-data-crawler",
    vendor: "cohere",
    category: "training",
    regex: /cohere-training-data-crawler/i,
  },
  {
    name: "cohere-ai",
    vendor: "cohere",
    category: "training",
    regex: /cohere-ai/i,
  },
  {
    name: "DuckAssistBot",
    vendor: "duckduckgo",
    category: "user",
    regex: /DuckAssistBot/i,
  },
  {
    name: "Amazonbot",
    vendor: "amazon",
    category: "training",
    regex: /Amazonbot/i,
  },
  {
    name: "NovaAct",
    vendor: "amazon",
    category: "user",
    regex: /NovaAct/i,
  },
  {
    name: "Diffbot",
    vendor: "diffbot",
    category: "training",
    regex: /Diffbot/i,
  },
  {
    name: "PetalBot",
    vendor: "huawei",
    category: "search",
    regex: /PetalBot/i,
  },
  {
    name: "YouBot",
    vendor: "you",
    category: "search",
    regex: /YouBot/i,
  },
  {
    name: "PhindBot",
    vendor: "phind",
    category: "search",
    regex: /PhindBot/i,
  },
  {
    name: "iaskspider",
    vendor: "iask",
    category: "search",
    regex: /iaskspider/i,
  },
  {
    name: "ImagesiftBot",
    vendor: "hive",
    category: "training",
    regex: /ImagesiftBot/i,
  },
];

// First-pass UA→Bot lookup. Used by middleware templates AND server.
export function detectBot(userAgent: string | null | undefined): Bot | null {
  if (!userAgent) return null;
  for (const bot of BOTS) {
    if (bot.regex.test(userAgent)) return bot;
  }
  return null;
}

// One big regex for the lightweight middleware templates we ship to customers.
// Customers paste this; they don't import @beam/bots. Keep in sync with BOTS.
export const BOTS_REGEX_SOURCE =
  "(GPTBot|OAI-SearchBot|ChatGPT-User|Operator|ClaudeBot|Claude-User|Claude-SearchBot|claude-web|anthropic-ai|claude-code|PerplexityBot|Perplexity-User|GoogleOther|Google-NotebookLM|Google-CloudVertexBot|bingbot|Applebot(?!-Extended)|meta-externalagent|meta-externalfetcher|facebookexternalhit|Bytespider|MistralAI-User|CCBot|cohere-ai|cohere-training-data-crawler|DuckAssistBot|Amazonbot|NovaAct|Diffbot|PetalBot|YouBot|PhindBot|iaskspider|ImagesiftBot)";

// Crude bot filter for the JS pixel path — we don't want JS-executing bots
// polluting human referral counts. Broader than BOTS regex on purpose; catches
// generic /bot/, /crawl/, headless browsers, scripted clients.
const HUMAN_PIXEL_BOT_PATTERNS: RegExp[] = [
  /bot\b/i,
  /\bcrawl/i,
  /\bspider/i,
  /\bslurp\b/i,
  /\bheadless/i,
  /\bphantomjs\b/i,
  /\bpuppeteer\b/i,
  /\bplaywright\b/i,
  /\bselenium\b/i,
  /\bcurl\//i,
  /\bwget\//i,
  /\bpython-requests\b/i,
  /\bgo-http-client\b/i,
  /\bnode-fetch\b/i,
  /\baxios\b/i,
  /\bokhttp\b/i,
];

export function isJsPixelBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  if (detectBot(userAgent)) return true;
  return HUMAN_PIXEL_BOT_PATTERNS.some((re) => re.test(userAgent));
}

// Re-export legacy names so existing call sites keep working.
export function isCrawler(ua: string | null | undefined): boolean {
  return isJsPixelBot(ua);
}
export function crawlerName(ua: string | null | undefined): string | null {
  if (!ua) return "Other crawler";
  const b = detectBot(ua);
  if (b) return b.name;
  if (isJsPixelBot(ua)) return "Other crawler";
  return null;
}
