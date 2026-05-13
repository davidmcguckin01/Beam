// app/api/opinly/route.ts
import { Webhook } from "svix";
import { OpinlyWebhookEvent } from "@opinly/backend";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Invalid request", { status: 400 });
  }

  const raw = await request.arrayBuffer();
  const buf = Buffer.from(raw);

  const wh = new Webhook(process.env.OPINLY_WEBHOOK_SIGNING_SECRET!);

  let evt: OpinlyWebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(buf, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as OpinlyWebhookEvent;
  } catch (err) {
    console.log("Error verifying webhook", JSON.stringify(err, null, 2));
    return new Response("Error verifying webhook", { status: 400 });
  }

  switch (evt.type) {
    case "content.paths-invalidated":
      for (const path of evt.data.paths) {
        revalidatePath(
          path === "/sitemap"
            ? ""
            : `${process.env.OPINLY_BLOG_PREFIX || "/blog"}${path}`
        );
      }
      return new Response("ok", { status: 200 });
  }
}
