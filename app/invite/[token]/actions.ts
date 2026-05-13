"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { beamInvite, beamMembership } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  ensureBeamSession,
  isMemberOfOrg,
  ACTIVE_ORG_COOKIE_NAME,
} from "@/lib/beam-auth";

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  if (!token) redirect("/app");

  const session = await ensureBeamSession();
  if (!session) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invite = (
    await db
      .select()
      .from(beamInvite)
      .where(eq(beamInvite.token, token))
      .limit(1)
  )[0];

  if (!invite) redirect("/app");
  if (invite.acceptedAt) redirect("/app");
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    redirect("/app");
  }

  if (!(await isMemberOfOrg(session.user.id, invite.orgId))) {
    await db.insert(beamMembership).values({
      userId: session.user.id,
      orgId: invite.orgId,
      role: invite.role,
    });
  }

  await db
    .update(beamInvite)
    .set({ acceptedAt: new Date() })
    .where(eq(beamInvite.id, invite.id));

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
