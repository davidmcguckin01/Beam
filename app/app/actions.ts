"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { site, event, dashboard } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { ensureOcholensSession, isMemberOfOrg } from "@/lib/beam-auth";
import { detectStack } from "@/lib/stack-detect";
import { TEST_PING_SOURCE } from "@/lib/test-ping";
import { verifyInstall, type VerifyResult } from "@/lib/verify-install";
import { resolveLayout } from "@/lib/dashboard-widgets";

function generateApiKey(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
  const session = await ensureOcholensSession();
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

  // Seed the default dashboard so the new site has one tab on first load.
  await db.insert(dashboard).values({
    siteId: newSite.id,
    name: "Default",
    position: 0,
    layout: null,
  });

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

// Delete a site and everything under it. The `dashboard` and `event` tables
// reference site.id with onDelete: "cascade", so the child rows go with it.
export async function deleteSiteAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  // The site whose dashboard the user is currently viewing, if any. Deleting
  // that site forces a navigation; deleting any other site just refreshes the
  // switcher in place so its dropdown stays open.
  const activeSiteId = String(formData.get("activeSiteId") || "");

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  await db.delete(site).where(eq(site.id, s.id));

  // Revalidate the whole /app subtree so the site switcher updates on
  // whatever page it's currently rendered on.
  revalidatePath("/app", "layout");

  // Only navigate when the user deleted the site they were viewing — its
  // dashboard route no longer exists. Otherwise stay put.
  if (activeSiteId && activeSiteId === s.id) redirect("/app");
}

// Edit a site's domain after creation. Runs the same normalisation as
// createSiteAction. When the domain actually changes, the detected platform
// is cleared — it was detected against the old domain and may now be wrong;
// the install card will offer to re-detect.
export async function updateSiteDomainAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const domain = cleanDomain(String(formData.get("domain") || ""));

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  // Empty/unparseable input or an unchanged domain — nothing to do.
  if (!domain || domain === s.domain) redirect(`/app/${s.id}`);

  await db
    .update(site)
    .set({ domain, stack: null, stackDetectedAt: null })
    .where(eq(site.id, s.id));

  revalidatePath("/app");
  redirect(`/app/${s.id}`);
}

// Re-run detection on demand (called when the user clicks "Re-detect" or when
// the dashboard loads a site with stack=null).
export async function redetectStackAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
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

// Clear a previously detected platform. Puts the site back into the
// "not yet checked" state (stack = null) so the user can re-run detection
// from scratch — useful when detection guessed wrong.
export async function resetStackAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s || s.orgId !== session.activeOrgId) redirect("/app");

  await db
    .update(site)
    .set({ stack: null, stackDetectedAt: null })
    .where(eq(site.id, s.id));

  redirect(`/app/${s.id}`);
}

// Writes a synthetic event so the user can verify the dashboard pipeline
// without having to visit their site from an external referrer.
export async function sendTestPingAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) redirect("/app");

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
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

// Real install verification — fetches the customer's homepage and checks the
// HTML for the Ocholens snippet keyed to this site's apiKey. Unlike
// sendTestPingAction (which writes a synthetic event and only proves Ocholens's
// own pipeline), this confirms the script is actually live on the site.
// Returns its result to the caller via useActionState — no redirect.
export async function verifyInstallAction(
  _prev: VerifyResult | null,
  formData: FormData,
): Promise<VerifyResult> {
  const session = await ensureOcholensSession();
  if (!session) return { status: "unreachable" };

  const siteId = String(formData.get("siteId") || "");
  if (!siteId) return { status: "unreachable" };

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s) return { status: "unreachable" };

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) return { status: "unreachable" };

  return verifyInstall(s.domain, s.apiKey);
}

// Helper: load a dashboard + its parent site, verifying that the current
// user is a member of the site's org. Used by every dashboard server action.
async function loadDashboardForUser(
  userId: string,
  dashboardId: string,
): Promise<{
  d: typeof dashboard.$inferSelect;
  s: typeof site.$inferSelect;
} | null> {
  const rows = await db
    .select({ d: dashboard, s: site })
    .from(dashboard)
    .innerJoin(site, eq(site.id, dashboard.siteId))
    .where(eq(dashboard.id, dashboardId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const member = await isMemberOfOrg(userId, row.s.orgId);
  if (!member) return null;
  return row;
}

// Persists the widget layout for one dashboard. The edit-mode UI submits the
// new layout as a JSON-encoded form field. resolveLayout drops unknown keys
// and malformed items so we never store garbage.
export async function saveDashboardLayoutAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const dashboardId = String(formData.get("dashboardId") || "");
  if (!dashboardId) redirect("/app");

  const loaded = await loadDashboardForUser(session.user.id, dashboardId);
  if (!loaded) redirect("/app");
  const { d, s } = loaded;

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("layout") || "[]"));
  } catch {
    parsed = [];
  }
  const layout = resolveLayout(parsed);

  await db
    .update(dashboard)
    .set({ layout, updatedAt: new Date() })
    .where(eq(dashboard.id, d.id));

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}?d=${d.id}`);
}

// Create a new dashboard tab for a site. Positioned at the end of the
// existing tabs.
export async function createDashboardAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  const rawName = String(formData.get("name") || "").trim();
  const name = rawName.slice(0, 60) || "Untitled";

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number>`coalesce(max(${dashboard.position}), -1)::int`,
    })
    .from(dashboard)
    .where(eq(dashboard.siteId, s.id));

  const [inserted] = await db
    .insert(dashboard)
    .values({
      siteId: s.id,
      name,
      position: Number(maxPos ?? -1) + 1,
      layout: null,
    })
    .returning({ id: dashboard.id });

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}?d=${inserted.id}`);
}

export async function renameDashboardAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const dashboardId = String(formData.get("dashboardId") || "");
  const rawName = String(formData.get("name") || "").trim();
  const name = rawName.slice(0, 60);
  if (!name) redirect("/app");

  const loaded = await loadDashboardForUser(session.user.id, dashboardId);
  if (!loaded) redirect("/app");
  const { d, s } = loaded;

  await db
    .update(dashboard)
    .set({ name, updatedAt: new Date() })
    .where(eq(dashboard.id, d.id));

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}?d=${d.id}`);
}

// Delete a dashboard. Refuses to delete the last remaining dashboard on a
// site so the user is never left with no tabs.
export async function deleteDashboardAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const dashboardId = String(formData.get("dashboardId") || "");
  const loaded = await loadDashboardForUser(session.user.id, dashboardId);
  if (!loaded) redirect("/app");
  const { d, s } = loaded;

  const remaining = await db
    .select({ id: dashboard.id })
    .from(dashboard)
    .where(eq(dashboard.siteId, s.id));
  if (remaining.length <= 1) {
    revalidatePath(`/app/${s.id}`);
    redirect(`/app/${s.id}?d=${d.id}`);
  }

  await db.delete(dashboard).where(eq(dashboard.id, d.id));

  // Pick the lowest-position dashboard left as the next active.
  const [next] = await db
    .select({ id: dashboard.id })
    .from(dashboard)
    .where(eq(dashboard.siteId, s.id))
    .orderBy(asc(dashboard.position))
    .limit(1);

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}?d=${next?.id ?? ""}`);
}

// Re-order dashboards. Accepts a JSON array of dashboard IDs in the new
// display order. Anything not in the list keeps its existing position
// (preserves siblings on different sites).
export async function reorderDashboardsAction(formData: FormData) {
  const session = await ensureOcholensSession();
  if (!session) redirect("/sign-in");

  const siteId = String(formData.get("siteId") || "");
  let ids: string[];
  try {
    const parsed = JSON.parse(String(formData.get("order") || "[]"));
    ids = Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    ids = [];
  }

  const rows = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  const s = rows[0];
  if (!s) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) redirect("/app");

  // Only update dashboards that belong to this site — defensive against a
  // forged order list referencing other sites' dashboards.
  const owned = await db
    .select({ id: dashboard.id })
    .from(dashboard)
    .where(eq(dashboard.siteId, s.id));
  const ownedIds = new Set(owned.map((r) => r.id));

  await Promise.all(
    ids
      .filter((id) => ownedIds.has(id))
      .map((id, i) =>
        db
          .update(dashboard)
          .set({ position: i, updatedAt: new Date() })
          .where(and(eq(dashboard.id, id), eq(dashboard.siteId, s.id))),
      ),
  );

  revalidatePath(`/app/${s.id}`);
  redirect(`/app/${s.id}`);
}
