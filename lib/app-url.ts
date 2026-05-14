// Resolves the public app URL used in install snippets, the /p.js loader,
// the /api/i ingest endpoint, and email/redirect links.
//
// Every deployed environment serves its APIs from the canonical brand domain
// — install snippets must never point customers at an ephemeral *.vercel.app
// alias. Only local dev (off-Vercel) falls back to NEXT_PUBLIC_APP_URL so a
// developer's snippets/links hit their own machine.

const PRODUCTION_APP_URL = "https://ocholens.com";

export function getAppUrl(): string {
  // process.env.VERCEL is set on every Vercel deployment (production and
  // previews alike) — anything running there is "production" for URL purposes.
  if (process.env.VERCEL) return PRODUCTION_APP_URL;

  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  return PRODUCTION_APP_URL;
}
