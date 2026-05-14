"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { site, event } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureBeamSession, isMemberOfOrg } from "@/lib/beam-auth";
import { detectStack } from "@/lib/stack-detect";
import { TEST_PING_SOURCE } from "@/lib/test-ping";
import { resolveLayout } from "@/lib/dashboard-widgets";

function generateApiKey(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function cleanDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/\/.*$/, "");
  d = d.replace(/^www\./, "");
  return d;
}

// Detection wrapped in a 6s ceiling. If the site is offline or slow we still
// create the row and just leave stack=null — the dashboard will retry on view.
async function detectWithTimeout(domain: string) {
  try {
    return await Promise.race([
      detectStack(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
  } catch {
    return null;
  }
}

export async function createSiteAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const raw = String(formData.get("domain") || "");
  const domain = cleanDomain(raw);
  if (!domain) redirect("/app");

  const inserted = await db
    .insert(site)
    .values({
      orgId: session.activeOrgId,
      domain,
      apiKey: generateApiKey(),
    })
    .returning();

  const newSite = inserted[0];

  // Best-effort stack detection. Never blocks the redirect on failure.
  const stack = await detectWithTimeout(domain);
  if (stack) {
    await db
      .update(site)
      .set({ stack, stackDetectedAt: new Date() })
      .where(eq(site.id, newSite.id));
  }

  redirect(`/app/${newSite.id}`);
}

// Re-run detection on demand (called when the user clicks "Re-detect" or when
// the dashboard loads a site with stack=null).
export async function redetectStackAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db
    .select()
    .from(site)
    .where(eq(site.id, siteId))
    .limit(1);
  const s = rows[0];
  if (!s || s.orgId !== session.activeOrgId) redirect("/app");

  const stack = await detectWithTimeout(s.domain);
  await db
    .update(site)
    .set({
      stack: stack ?? "unknown",
      stackDetectedAt: new Date(),
    })
    .where(eq(site.id, s.id));

  redirect(`/app/${s.id}`);
}

// Writes a synthetic event so the user can verify the dashboard pipeline
// without having to visit their site from an external referrer.
export async function sendTestPingAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db
    .select()
    .from(site)
    .where(eq(site.id, siteId))
    .limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  await db.insert(event).values({
    siteId: s.id,
    url: `https://${s.domain}/`,
    referrer: "https://beam.dev/test",
    referrerHost: "beam.dev",
    source: TEST_PING_SOURCE,
    country: null,
    kind: "human",
  });

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}`);
}

// Persists the dashboard widget layout for a site. Accepts the new ordered
// list of widget keys as a JSON-encoded form field so the customise UI can
// submit it via a hidden input. Validates via resolveLayout so unknown keys
// are dropped server-side too.
export async function saveDashboardLayoutAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db
    .select()
    .from(site)
    .where(eq(site.id, siteId))
    .limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("layout") || "[]"));
  } catch {
    parsed = [];
  }
  const layout = Array.isArray(parsed) ? resolveLayout(parsed as string[]) : [];

  await db
    .update(site)
    .set({ dashboardLayout: layout })
    .where(eq(site.id, s.id));

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}`);
}
