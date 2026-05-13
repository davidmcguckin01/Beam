"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { beamOrg, beamMembership } from "@/db/schema";
import {
  ensureBeamSession,
  isMemberOfOrg,
  ACTIVE_ORG_COOKIE_NAME,
} from "@/lib/beam-auth";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setActiveOrgAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const orgId = String(formData.get("orgId") || "");
  if (!orgId) redirect("/app");

  const member = await isMemberOfOrg(session.user.id, orgId);
  if (!member) redirect("/app");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  redirect("/app");
}

export async function createOrgAction(formData: FormData) {
  const session = await ensureBeamSession();
  if (!session) redirect("/sign-in");

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/app");

  const org = (await db.insert(beamOrg).values({ name }).returning())[0];
  await db.insert(beamMembership).values({
    userId: session.user.id,
    orgId: org.id,
    role: "owner",
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  redirect("/app");
}
