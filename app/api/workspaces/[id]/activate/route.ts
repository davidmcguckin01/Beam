import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { getOrCreateUser } from "@/lib/user";
import { getWorkspace, getWorkspaceByClerkOrgId } from "@/lib/workspace";
import { eq } from "drizzle-orm";

// POST activate a temp workspace by creating a Clerk organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = await getOrCreateUser(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.firstName,
      clerkUser.lastName
    );

    // Try to get workspace by database ID first, then by Clerk org ID
    let workspace = await getWorkspace(id);
    if (!workspace) {
      workspace = await getWorkspaceByClerkOrgId(id);
    }

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if it's already activated (not a temp workspace)
    if (!workspace.clerkOrganizationId.startsWith("temp-")) {
      return NextResponse.json({
        workspace,
        message: "Workspace is already activated",
      });
    }

    const client = await clerkClient();

    // Sanitize the workspace name
    const sanitizedName =
      workspace.name.replace(/'s Workspace$/, "").trim() || "My Workspace";

    // Generate a clean slug
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50);
    };

    const cleanSlug = workspace.slug
      ? workspace.slug.replace(/[^a-z0-9-]/g, "").substring(0, 50)
      : generateSlug(sanitizedName);

    // Try to create organization, first with slug, then without if slug fails or is disabled
    let newOrg;
    try {
      newOrg = await client.organizations.createOrganization({
        name: sanitizedName,
        slug: cleanSlug || undefined,
        createdBy: userId,
      });
    } catch (slugError: any) {
      // Check if the error is about slugs being disabled
      const isSlugDisabled =
        slugError?.errors?.[0]?.code === "organization_slugs_disabled" ||
        slugError?.errors?.[0]?.message?.toLowerCase().includes("slug") ||
        (slugError?.status === 403 && cleanSlug);

      // If slug is the issue (disabled or invalid), try without it
      if (isSlugDisabled || (slugError?.status === 422 && cleanSlug)) {
        console.log(
          "Slugs disabled or invalid, creating organization without slug..."
        );
        newOrg = await client.organizations.createOrganization({
          name: sanitizedName,
          createdBy: userId,
        });
      } else {
        throw slugError;
      }
    }

    // Update the workspace with the real Clerk organization ID
    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        clerkOrganizationId: newOrg.id,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspace.id))
      .returning();

    // Add user to the organization as admin (since they're the owner)
    try {
      await client.organizations.createOrganizationMembership({
        organizationId: newOrg.id,
        userId: userId,
        role: "org:admin",
      });
    } catch (membershipError: any) {
      // If user is already a member, try to update their role
      if (membershipError?.errors?.[0]?.message?.includes("already")) {
        try {
          await client.organizations.updateOrganizationMembership({
            organizationId: newOrg.id,
            userId: userId,
            role: "org:admin",
          });
        } catch (updateError) {
          console.warn("Could not update user role to admin:", updateError);
        }
      } else {
        console.warn("Could not add user to organization:", membershipError);
      }
    }

    return NextResponse.json({
      workspace: updatedWorkspace,
      clerkOrganizationId: newOrg.id,
      message: "Workspace activated successfully",
    });
  } catch (error: any) {
    console.error("Error activating workspace:", error);

    const errorDetails = {
      error: error.message,
      status: error.status,
      errors: error.errors,
      clerkErrorCode: error?.errors?.[0]?.code,
      clerkErrorMessage: error?.errors?.[0]?.message,
      clerkLongMessage: error?.errors?.[0]?.longMessage,
    };

    if (error?.status === 403) {
      const clerkErrorMsg =
        error?.errors?.[0]?.message ||
        error?.errors?.[0]?.longMessage ||
        "Permission denied";
      const clerkErrorCode = error?.errors?.[0]?.code || "";

      return NextResponse.json(
        {
          error: `Cannot create organization: ${clerkErrorMsg}${
            clerkErrorCode ? ` (${clerkErrorCode})` : ""
          }. Please check that: 1) Organizations are enabled in your Clerk Dashboard, 2) Your CLERK_SECRET_KEY has permission to create organizations, and 3) You have permission to create organizations in your Clerk account.`,
          details: errorDetails,
        },
        { status: 403 }
      );
    }

    if (error?.status === 422) {
      const errorMessage =
        error?.errors?.[0]?.message ||
        error?.errors?.[0]?.longMessage ||
        "Invalid organization name or slug";
      return NextResponse.json(
        {
          error: `Failed to create organization: ${errorMessage}`,
          details: errorDetails,
        },
        { status: 422 }
      );
    }

    const errorMessage =
      error?.errors?.[0]?.message ||
      error?.errors?.[0]?.longMessage ||
      error?.message ||
      "Unknown error";
    return NextResponse.json(
      {
        error: `Failed to activate workspace: ${errorMessage}`,
        details: errorDetails,
      },
      { status: error?.status || 500 }
    );
  }
}
