// Resolves the public app URL used in install snippets, the /p.js loader,
// and email/redirect links. Priority:
//   1. NEXT_PUBLIC_APP_URL if set and not a localhost value
//   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel-injected stable prod alias)
//   3. VERCEL_URL (deployment-specific alias)
//   4. NEXT_PUBLIC_APP_URL as-is (covers local dev → http://localhost:3000)
//   5. empty string

export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && !/localhost|127\.0\.0\.1/.test(explicit)) {
    return explicit.replace(/\/$/, "");
  }
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prodHost) return `https://${prodHost.replace(/\/$/, "")}`;
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;
  if (explicit) return explicit.replace(/\/$/, "");
  return "";
}
