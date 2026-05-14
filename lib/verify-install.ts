// Real install verification: fetches a customer's homepage and checks whether
// the Ocholens snippet is actually present in the HTML, keyed to this site's
// apiKey. This is distinct from a synthetic "test ping" — a test ping only
// proves Ocholens's own ingest pipeline works; it says nothing about whether the
// script is live on the customer's site. This does.

export type VerifyResult =
  | { status: "installed" }
  | { status: "not-found" }
  | { status: "unreachable" };

const FETCH_TIMEOUT_MS = 6000;
const UA = "OcholensBot/1.0 (+https://beam.dev/bot)";

// Fetch the homepage. HTTPS first, HTTP fallback — some sites are HTTP-only.
async function fetchHome(domain: string): Promise<string | null> {
  for (const proto of ["https", "http"]) {
    try {
      const res = await fetch(`${proto}://${domain}/`, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": UA, accept: "text/html,*/*" },
      });
      // A 5xx may just be a flaky edge — try the other protocol before
      // giving up. 4xx still gives us HTML worth scanning.
      if (!res.ok && res.status >= 500) continue;
      return await res.text();
    } catch {
      // timeout / DNS / TLS error — try next protocol
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The install snippet bakes the site's apiKey into the script pixel's
// `data-site` attribute and the <noscript> pixel's `?s=` query param. We
// match on the apiKey specifically — a bare `/p.js` reference says nothing
// about *which* site it belongs to, but the apiKey is unique per site.
export function htmlHasSnippet(html: string, apiKey: string): boolean {
  if (!apiKey) return false;
  const key = escapeRegex(apiKey);
  // <script ... data-site="APIKEY" ...> — tolerate either quote style.
  const scriptPixel = new RegExp(`data-site\\s*=\\s*["']${key}["']`, "i");
  // ...?s=APIKEY (noscript pixel / direct ingest URL).
  const queryPixel = new RegExp(`[?&]s=${key}(?:["'&\\s]|$)`, "i");
  return scriptPixel.test(html) || queryPixel.test(html);
}

export async function verifyInstall(
  domain: string,
  apiKey: string,
): Promise<VerifyResult> {
  const html = await fetchHome(domain);
  if (html === null) return { status: "unreachable" };
  return htmlHasSnippet(html, apiKey)
    ? { status: "installed" }
    : { status: "not-found" };
}
