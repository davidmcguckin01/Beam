import "server-only";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { beamUser, beamOrg, beamMembership } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const ACTIVE_ORG_COOKIE = "beam_active_org";

export type OcholensSession = {
  user: {
    id: string;
    clerkUserId: string;
    email: string;
    firstName: string | null;
    displayName: string;
  };
  orgs: { id: string; name: string; role: string }[];
  activeOrgId: string;
  activeOrg: { id: string; name: string; role: string };
};

// Ensures the Clerk user has a row in beam_user and at least one org/membership.
// On first call: creates the user row, a personal org, and an owner membership.
// Active org is resolved from the beam_active_org cookie when valid, else first.
export async function ensureOcholensSession(): Promise<OcholensSession | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses[0]?.emailAddress ??
    "";

  let user = (
    await db
      .select()
      .from(beamUser)
      .where(eq(beamUser.clerkUserId, userId))
      .limit(1)
  )[0];

  if (!user) {
    user = (
      await db
        .insert(beamUser)
        .values({ clerkUserId: userId, email })
        .returning()
    )[0];
  }

  let memberships = await db
    .select({
      orgId: beamMembership.orgId,
      role: beamMembership.role,
      name: beamOrg.name,
    })
    .from(beamMembership)
    .innerJoin(beamOrg, eq(beamOrg.id, beamMembership.orgId))
    .where(eq(beamMembership.userId, user.id));

  if (memberships.length === 0) {
    const display =
      [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0] ||
      "My";
    const org = (
      await db
        .insert(beamOrg)
        .values({ name: `${display}'s workspace` })
        .returning()
    )[0];
    await db.insert(beamMembership).values({
      userId: user.id,
      orgId: org.id,
      role: "owner",
    });
    memberships = [{ orgId: org.id, role: "owner", name: org.name }];
  }

  const orgs = memberships.map((m) => ({
    id: m.orgId,
    name: m.name,
    role: m.role,
  }));

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg = orgs.find((o) => o.id === cookieOrgId) ?? orgs[0];

  const firstName = cu?.firstName ?? null;
  const displayName =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim() ||
    (user.email ? user.email.split("@")[0] : "there");

  return {
    user: {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName,
      displayName,
    },
    orgs,
    activeOrgId: activeOrg.id,
    activeOrg,
  };
}

export async function isMemberOfOrg(
  beamUserId: string,
  orgId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: beamMembership.id })
    .from(beamMembership)
    .where(
      and(
        eq(beamMembership.userId, beamUserId),
        eq(beamMembership.orgId, orgId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getMembership(
  beamUserId: string,
  orgId: string,
): Promise<{ role: string } | null> {
  const rows = await db
    .select({ role: beamMembership.role })
    .from(beamMembership)
    .where(
      and(
        eq(beamMembership.userId, beamUserId),
        eq(beamMembership.orgId, orgId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export const ACTIVE_ORG_COOKIE_NAME = ACTIVE_ORG_COOKIE;
