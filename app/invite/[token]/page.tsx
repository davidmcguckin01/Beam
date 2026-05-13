import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/db";
import { beamInvite, beamMembership, beamOrg } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  ensureBeamSession,
  isMemberOfOrg,
  ACTIVE_ORG_COOKIE_NAME,
} from "@/lib/beam-auth";
import { acceptInviteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = (
    await db
      .select({
        id: beamInvite.id,
        orgId: beamInvite.orgId,
        email: beamInvite.email,
        role: beamInvite.role,
        expiresAt: beamInvite.expiresAt,
        acceptedAt: beamInvite.acceptedAt,
        orgName: beamOrg.name,
      })
      .from(beamInvite)
      .innerJoin(beamOrg, eq(beamOrg.id, beamInvite.orgId))
      .where(eq(beamInvite.token, token))
      .limit(1)
  )[0];

  if (!invite) return <Notice title="Invite not found" body="This invite link is invalid." />;
  if (invite.acceptedAt) {
    return <Notice title="Already accepted" body="This invite has already been used." />;
  }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return <Notice title="Invite expired" body="Ask for a new invite link." />;
  }

  const session = await ensureBeamSession();
  if (!session) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // Already a member? Just switch active org and bounce to dashboard.
  if (await isMemberOfOrg(session.user.id, invite.orgId)) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE_NAME, invite.orgId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    redirect("/app");
  }

  // Otherwise show a confirmation screen — accept is one click.
  return (
    <main className="min-h-screen bg-white text-black antialiased">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          Beam
        </Link>
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Join {invite.orgName}
          </h1>
          <p className="mt-2 text-sm text-black/60">
            You've been invited as <b className="text-black">{invite.role}</b>.
            Accepting will give you access to all sites in this workspace.
          </p>

          <form action={acceptInviteAction} className="mt-6 flex gap-2">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white hover:bg-black/85"
            >
              Accept invite
            </button>
            <Link
              href="/app"
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-5 text-sm font-medium text-black hover:bg-black/3"
            >
              Cancel
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-white text-black antialiased">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-black/60">{body}</p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-10 items-center rounded-md border border-black/10 px-4 text-sm font-medium text-black hover:bg-black/3"
        >
          Go to Beam
        </Link>
      </div>
    </main>
  );
}

// (Note: <Membership status check> deliberately ignores email match — anyone
// with the token can accept. Sharing a link is the auth.)
