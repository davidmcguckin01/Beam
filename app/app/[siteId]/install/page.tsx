import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { site } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureBeamSession, isMemberOfOrg } from "@/lib/beam-auth";
import { buildSnippets } from "@/lib/snippets";
import { getAppUrl } from "@/lib/app-url";
import { describeStack, type Stack } from "@/lib/stack-detect";
import { BeamHeader } from "@/components/beam-header";
import { InstallCard } from "../install-card";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const rows = await db
    .select()
    .from(site)
    .where(eq(site.id, siteId))
    .limit(1);
  const s = rows[0];
  if (!s) notFound();

  const member = await isMemberOfOrg(session.user.id, s.orgId);
  if (!member) notFound();

  const orgSites = await db
    .select({ id: site.id, domain: site.domain })
    .from(site)
    .where(eq(site.orgId, s.orgId))
    .orderBy(desc(site.createdAt));

  const appUrl = getAppUrl();
  const stack = (s.stack as Stack | null) ?? null;
  const snippets = buildSnippets({
    appUrl,
    apiKey: s.apiKey,
    stack,
    domain: s.domain,
  });
  const detected =
    stack && stack !== "unknown"
      ? {
          label: describeStack(stack).label,
          serverSideAvailable: describeStack(stack).serverSideAvailable,
        }
      : null;

  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <BeamHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={orgSites}
        activeSite={{ id: s.id, domain: s.domain }}
        current={null}
      />

      <div className="px-6 py-8 space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl tracking-tight text-black">
              Install
            </h1>
            <p className="mt-1 text-[13px] text-black/50">
              {s.domain} · paste once, never again
            </p>
          </div>
          <Link
            href={`/app/${s.id}`}
            className="text-[12.5px] text-black/55 hover:text-black"
          >
            ← back to dashboard
          </Link>
        </div>

        <InstallCard snippets={snippets} detected={detected} siteId={s.id} />
      </div>
    </main>
  );
}
