export const AI_SOURCES: Record<string, string> = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "claude.ai": "Claude",
  "perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "you.com": "You.com",
  "phind.com": "Phind",
  "meta.ai": "Meta AI",
  "duckduckgo.com": "DuckDuckGo",
};

export function extractHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function detectSource(referrer: string | null): string | null {
  const host = extractHost(referrer);
  if (!host) return null;
  return AI_SOURCES[host] ?? null;
}
