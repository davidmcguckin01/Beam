import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { getOrCreateUser } from "@/lib/user";
import {
  getOrCreateWorkspace,
  getUserWorkspaces,
  getWorkspaceMembers,
  addUserToWorkspace,
} from "@/lib/workspace";
import { eq } from "drizzle-orm";

// GET all workspaces for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get user's Clerk organizations
    const orgMemberships = (clerkUser as any).organizationMemberships || [];

    // Sync workspaces with Clerk organizations (if any exist)
    if (orgMemberships.length > 0) {
      await Promise.all(
        orgMemberships.map(async (orgMembership: any) => {
          const org = orgMembership.organization;
          if (!org || !org.id) return null;

          const workspace = await getOrCreateWorkspace(
            org.id,
            org.name,
            org.slug || undefined
          );

          // Ensure user is a member of the workspace
          await addUserToWorkspace(
            workspace.id,
            user.id,
            orgMembership.role === "org:admin" ? "admin" : "member"
          );

          return workspace;
        })
      );
    }

    // Get all workspaces the user is a member of
    const userWorkspaces = await getUserWorkspaces(user.id);

    return NextResponse.json({
      workspaces: userWorkspaces.map((uw) => ({
        ...uw.workspace,
        role: uw.role,
        joinedAt: uw.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching workspaces",
      },
      { status: 500 }
    );
  }
}

// POST create a new workspace (creates Clerk organization)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Create organization in Clerk
    // Note: Organizations must be enabled in Clerk Dashboard
    // Users can also create organizations through Clerk's UI components
    const client = await clerkClient();
    let organization;
    try {
      organization = await client.organizations.createOrganization({
        name: name.trim(),
        slug: slug?.trim() || undefined,
        createdBy: userId,
      });
    } catch (error: any) {
      // Check if the error is about slugs being disabled
      const isSlugDisabled =
        error?.errors?.[0]?.code === "organization_slugs_disabled" ||
        error?.errors?.[0]?.message?.toLowerCase().includes("slug");

      // If we got a 403 and provided a slug, try without it (slugs might be disabled)
      // Or if the error explicitly mentions slugs, try without it
      if ((error?.status === 403 && slug?.trim()) || isSlugDisabled) {
        console.log(
          "Slug may be disabled or causing issues, trying without slug..."
        );
        try {
          organization = await client.organizations.createOrganization({
            name: name.trim(),
            createdBy: userId,
          });
          console.log("Successfully created organization without slug");
        } catch (retryError: any) {
          // If retry also fails, provide detailed error message
          const errorDetails = {
            error: retryError.message,
            status: retryError.status,
            errors: retryError.errors,
            clerkErrorCode: retryError?.errors?.[0]?.code,
            clerkErrorMessage: retryError?.errors?.[0]?.message,
            clerkLongMessage: retryError?.errors?.[0]?.longMessage,
          };

          console.error(
            "Error creating organization (retry without slug):",
            errorDetails
          );

          if (retryError?.status === 403) {
            // If organizations aren't enabled, create a temporary workspace instead
            console.log(
              "Organizations not enabled, creating temporary workspace..."
            );

            const user = await getOrCreateUser(
              clerkUser.id,
              clerkUser.emailAddresses[0]?.emailAddress || "",
              clerkUser.firstName,
              clerkUser.lastName
            );

            // Generate a temporary organization ID
            const tempOrgId = `temp-${crypto.randomUUID()}`;

            // Generate slug
            const generateSlug = (name: string): string => {
              return name
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, "")
                .replace(/[\s_-]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .substring(0, 50);
            };

            let finalSlug = generateSlug(name.trim());

            // Ensure slug is unique
            let uniqueSlug = finalSlug;
            let counter = 1;
            let checkSlug = await db
              .select()
              .from(workspaces)
              .where(eq(workspaces.slug, uniqueSlug))
              .limit(1);

            while (checkSlug.length > 0) {
              uniqueSlug = `${finalSlug}-${counter}`;
              checkSlug = await db
                .select()
                .from(workspaces)
                .where(eq(workspaces.slug, uniqueSlug))
                .limit(1);
              if (checkSlug.length === 0) {
                break;
              }
              counter++;
            }

            // Create temporary workspace
            const [tempWorkspace] = await db
              .insert(workspaces)
              .values({
                clerkOrganizationId: tempOrgId,
                name: name.trim(),
                slug: uniqueSlug,
              })
              .returning();

            // Add user as owner
            await addUserToWorkspace(tempWorkspace.id, user.id, "owner");

            return NextResponse.json({
              workspace: tempWorkspace,
              isTemporary: true,
              message:
                "Workspace created successfully. To enable team collaboration features, please enable organizations in your Clerk Dashboard and activate this workspace.",
            });
          }
          throw retryError;
        }
      } else {
        // If organization creation fails, it might be because:
        // 1. Organizations are not enabled in Clerk Dashboard
        // 2. The API key doesn't have permission
        // 3. The user doesn't have permission
        const errorDetails = {
          error: error.message,
          status: error.status,
          errors: error.errors,
          clerkErrorCode: error?.errors?.[0]?.code,
          clerkErrorMessage: error?.errors?.[0]?.message,
          clerkLongMessage: error?.errors?.[0]?.longMessage,
        };

        console.error("Error creating organization:", errorDetails);

        if (error?.status === 403) {
          // If organizations aren't enabled, create a temporary workspace instead
          // This allows users to still create workspaces and activate them later
          console.log(
            "Organizations not enabled, creating temporary workspace..."
          );

          const user = await getOrCreateUser(
            clerkUser.id,
            clerkUser.emailAddresses[0]?.emailAddress || "",
            clerkUser.firstName,
            clerkUser.lastName
          );

          // Generate a temporary organization ID
          const tempOrgId = `temp-${crypto.randomUUID()}`;

          // Generate slug
          const generateSlug = (name: string): string => {
            return name
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, "")
              .replace(/[\s_-]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .substring(0, 50);
          };

          let finalSlug = slug?.trim() || generateSlug(name.trim());

          // Ensure slug is unique
          let uniqueSlug = finalSlug;
          let counter = 1;
          let checkSlug = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.slug, uniqueSlug))
            .limit(1);

          while (checkSlug.length > 0) {
            uniqueSlug = `${finalSlug}-${counter}`;
            checkSlug = await db
              .select()
              .from(workspaces)
              .where(eq(workspaces.slug, uniqueSlug))
              .limit(1);
            if (checkSlug.length === 0) {
              break;
            }
            counter++;
          }

          // Create temporary workspace
          const [tempWorkspace] = await db
            .insert(workspaces)
            .values({
              clerkOrganizationId: tempOrgId,
              name: name.trim(),
              slug: uniqueSlug,
            })
            .returning();

          // Add user as owner
          await addUserToWorkspace(tempWorkspace.id, user.id, "owner");

          return NextResponse.json({
            workspace: tempWorkspace,
            isTemporary: true,
            message:
              "Workspace created successfully. To enable team collaboration features, please enable organizations in your Clerk Dashboard and activate this workspace.",
          });
        }
        throw error;
      }
    }

    // Get or create workspace in our database
    const workspace = await getOrCreateWorkspace(
      organization.id,
      organization.name,
      organization.slug || undefined
    );

    // Add user as owner
    const user = await getOrCreateUser(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.firstName,
      clerkUser.lastName
    );

    await addUserToWorkspace(workspace.id, user.id, "owner");

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while creating workspace",
      },
      { status: 500 }
    );
  }
}
