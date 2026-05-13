import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { userOnboardingProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/user";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Sync user with database
    const user = await getOrCreateUser(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.firstName,
      clerkUser.lastName
    );

    // Parse request body
    const body = await request.json();
    const { teamSize, feedbackMethod, mainPainPoint, companySize, role } = body;

    // Check if onboarding profile already exists
    const existingProfile = await db
      .select()
      .from(userOnboardingProfiles)
      .where(eq(userOnboardingProfiles.userId, user.id))
      .limit(1);

    if (existingProfile.length > 0) {
      // Update existing profile
      const [updatedProfile] = await db
        .update(userOnboardingProfiles)
        .set({
          teamSize: teamSize || null,
          feedbackMethod: feedbackMethod || null,
          mainPainPoint: mainPainPoint || null,
          companySize: companySize || null,
          role: role || null,
          updatedAt: new Date(),
        })
        .where(eq(userOnboardingProfiles.userId, user.id))
        .returning();

      return NextResponse.json({ success: true, profile: updatedProfile });
    } else {
      // Create new profile
      const [newProfile] = await db
        .insert(userOnboardingProfiles)
        .values({
          userId: user.id,
          teamSize: teamSize || null,
          feedbackMethod: feedbackMethod || null,
          mainPainPoint: mainPainPoint || null,
          companySize: companySize || null,
          role: role || null,
        })
        .returning();

      return NextResponse.json({ success: true, profile: newProfile });
    }
  } catch (error) {
    console.error("Error saving onboarding profile:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get onboarding profile
    const [profile] = await db
      .select()
      .from(userOnboardingProfiles)
      .where(eq(userOnboardingProfiles.userId, user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching onboarding profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding profile" },
      { status: 500 }
    );
  }
}
