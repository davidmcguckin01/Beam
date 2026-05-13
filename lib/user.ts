import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(
  clerkId: string,
  email: string,
  firstName?: string | null,
  lastName?: string | null
) {
  // Try to find existing user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existingUser.length > 0) {
    // Update user info if it changed
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();

    return updatedUser;
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
    })
    .returning();

  return newUser;
}
