"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { beamInvite, beamMembership } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureBeamSession, getMembership } from "@/lib/beam-auth";

function generateInviteToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function inviteAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  // Optional return path. The first-run "Invite your team" card on a site
  // dashboard passes its own URL so a successful invite doesn't bounce the
  // user out to Settings mid-onboarding. Restricted to internal /app/ paths.
  const rawRedirect = String(formData.get("redirectTo") || "");
  const back =
    rawRedirect.startsWith("/app/") && !rawRedirect.includes("?")
      ? rawRedirect
      : null;
  const err = (code: string) => back ?? `/app/settings?err=${code}`;

  const orgId = session.activeOrgId;
  const member = await getMembership(session.user.id, orgId);
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect(err("forbidden"));
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "member");
  if (!email || !email.includes("@")) {
    redirect(err("invalid_email"));
  }
  if (!["owner", "admin", "member"].includes(role)) {
    redirect(err("invalid_role"));
  }

  await db.insert(beamInvite).values({
    orgId,
    email,
    role,
    token: generateInviteToken(),
    invitedBy: session.user.id,
    expiresAt: new Date(Date.now() + FOURTEEN_DAYS_MS),
  });

  redirect(back ?? "/app/settings?ok=invited");
}

export async function revokeInviteAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const inviteId = String(formData.get("inviteId") || "");
  if (!inviteId) redirect("/app/settings");

  const member = await getMembership(session.user.id, session.activeOrgId);
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect("/app/settings?err=forbidden");
  }

  await db
    .delete(beamInvite)
    .where(
      and(
        eq(beamInvite.id, inviteId),
        eq(beamInvite.orgId, session.activeOrgId)
      )
    );

  redirect("/app/settings?ok=revoked");
}

export async function removeMemberAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const memberId = String(formData.get("membershipId") || "");
  if (!memberId) redirect("/app/settings");

  const me = await getMembership(session.user.id, session.activeOrgId);
  if (!me || me.role !== "owner") {
    redirect("/app/settings?err=forbidden");
  }

  // Can't remove the last owner — would orphan the org.
  await db
    .delete(beamMembership)
    .where(
      and(
        eq(beamMembership.id, memberId),
        eq(beamMembership.orgId, session.activeOrgId)
      )
    );

  redirect("/app/settings?ok=removed");
}
