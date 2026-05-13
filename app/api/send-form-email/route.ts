import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { sendFormShareEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const body = await request.json();
    const { email, formTitle, formUrl } = body;

    if (!email || !formTitle || !formUrl) {
      return NextResponse.json(
        { error: "Email, form title, and form URL are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const senderName =
      [context.user.firstName, context.user.lastName]
        .filter(Boolean)
        .join(" ") || context.user.email;

    await sendFormShareEmail({
      to: email,
      formTitle,
      formUrl,
      senderName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending form share email:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
