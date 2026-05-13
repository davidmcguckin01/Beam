import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    if (!id) {
      return new Response("User ID is missing", { status: 400 });
    }

    try {
      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, id))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(users)
          .set({
            email: email_addresses[0]?.email_address || "",
            firstName: first_name || null,
            lastName: last_name || null,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id));
      } else {
        // Create new user
        await db.insert(users).values({
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || null,
          lastName: last_name || null,
        });
      }
    } catch (error) {
      console.error("Error syncing user:", error);
      return new Response("Error syncing user", {
        status: 500,
      });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (!id) {
      return new Response("User ID is missing", { status: 400 });
    }

    try {
      await db.delete(users).where(eq(users.clerkId, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      // User might not exist, which is fine
    }
  }

  return new Response("", { status: 200 });
}
