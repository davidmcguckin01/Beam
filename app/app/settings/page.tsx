import { redirect } from "next/navigation";
import { db } from "@/db";
import { beamUser, beamMembership, beamInvite, site } from "@/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { ensureBeamSession, getMembership } from "@/lib/beam-auth";
import { BeamHeader } from "@/components/beam-header";
import {
  inviteAction,
  revokeInviteAction,
  removeMemberAction,
} from "./actions";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const sp = await searchParams;
  const orgId = session.activeOrgId;

  const myRole = (await getMembership(session.user.id, orgId))?.role ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const members = await db
    .select({
      membershipId: beamMembership.id,
      role: beamMembership.role,
      userId: beamUser.id,
      email: beamUser.email,
      createdAt: beamMembership.createdAt,
    })
    .from(beamMembership)
    .innerJoin(beamUser, eq(beamUser.id, beamMembership.userId))
    .where(eq(beamMembership.orgId, orgId))
    .orderBy(desc(beamMembership.createdAt));

  const invites = await db
    .select()
    .from(beamInvite)
    .where(
      and(eq(beamInvite.orgId, orgId), isNull(beamInvite.acceptedAt))
    )
    .orderBy(desc(beamInvite.createdAt));

  const orgSites = await db
    .select({ id: site.id, domain: site.domain })
    .from(site)
    .where(eq(site.orgId, orgId))
    .orderBy(desc(site.createdAt));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <main className="min-h-screen bg-[#fafafa] text-black antialiased">
      <BeamHeader
        orgs={session.orgs}
        activeOrg={session.activeOrg}
        sites={orgSites}
        activeSite={null}
        current="settings"
      />

      <div className="px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-black/50">
            {session.activeOrg.name} · your role: {myRole}
          </p>
        </div>

        {sp.ok && (
          <Banner kind="ok">
            {sp.ok === "invited" && "Invite created."}
            {sp.ok === "revoked" && "Invite revoked."}
            {sp.ok === "removed" && "Member removed."}
          </Banner>
        )}
        {sp.err && (
          <Banner kind="err">
            {sp.err === "forbidden" && "You don't have permission for that."}
            {sp.err === "invalid_email" && "Please enter a valid email."}
            {sp.err === "invalid_role" && "Invalid role."}
          </Banner>
        )}

        {canManage && (
          <Section title="Invite teammate">
            <form
              action={inviteAction}
              className="flex flex-wrap items-center gap-2 px-6 py-4"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="name@company.com"
                className="block w-full max-w-xs rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
              />
              <select
                name="role"
                defaultValue="member"
                className="rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-black focus:border-black/40 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-black px-4 text-[13px] font-medium text-white hover:bg-black/85"
              >
                Send invite
              </button>
              <p className="basis-full text-[11px] text-black/45">
                We don't send emails yet — share the link manually.
              </p>
            </form>
          </Section>
        )}

        <Section title="Pending invites" right={`${invites.length}`}>
          {invites.length === 0 ? (
            <div className="px-6 py-6 text-center text-[13px] text-black/40">
              No pending invites.
            </div>
          ) : (
            <ul className="divide-y divide-black/8">
              {invites.map((inv) => {
                const url = `${appUrl}/invite/${inv.token}`;
                return (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] text-black">
                        {inv.email}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-black/50">
                        {inv.role}
                        {inv.expiresAt
                          ? ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                          : ""}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="block max-w-104 truncate rounded border border-black/8 bg-black/3 px-2 py-1 font-mono text-[11px] text-black/70">
                          {url}
                        </code>
                        <CopyButton value={url} />
                      </div>
                    </div>
                    {canManage && (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <button
                          type="submit"
                          className="inline-flex h-7 items-center rounded-md border border-black/10 px-2.5 text-[11px] text-black/70 hover:bg-black/3 hover:text-black"
                        >
                          Revoke
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Members" right={`${members.length}`}>
          <ul className="divide-y divide-black/8">
            {members.map((m) => {
              const isMe = m.userId === session.user.id;
              const canRemove =
                myRole === "owner" && !isMe && m.role !== "owner";
              return (
                <li
                  key={m.membershipId}
                  className="flex items-center justify-between px-6 py-3.5"
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[13px] text-black">
                        {m.email}
                      </span>
                      {isMe && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-black/40">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-black/50">
                      {m.role} · joined{" "}
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {canRemove && (
                    <form action={removeMemberAction}>
                      <input
                        type="hidden"
                        name="membershipId"
                        value={m.membershipId}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-7 items-center rounded-md border border-black/10 px-2.5 text-[11px] text-black/70 hover:bg-black/3 hover:text-black"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
      <div className="flex items-baseline justify-between gap-4 border-b border-black/8 px-6 py-3.5">
        <h2 className="text-[13px] font-medium text-black">{title}</h2>
        {right && (
          <span className="font-mono text-[11px] tabular-nums text-black/40">
            {right}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "ok" | "err";
  children: React.ReactNode;
}) {
  const cls =
    kind === "ok"
      ? "border-emerald-300/60 bg-emerald-50 text-emerald-900"
      : "border-red-300/60 bg-red-50 text-red-900";
  return (
    <div className={`rounded-md border px-4 py-2.5 text-[13px] ${cls}`}>
      {children}
    </div>
  );
}
