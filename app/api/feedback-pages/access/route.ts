import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email } = body;

    if (!slug || !email) {
      return NextResponse.json(
        { error: "Slug and email are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    const [page] = await db
      .select()
      .from(feedbackPages)
      .where(eq(feedbackPages.slug, slug))
      .limit(1);

    if (!page) {
      return NextResponse.json(
        { error: "Feedback page not found" },
        { status: 404 }
      );
    }

    // Public pages don't require special access
    if (page.isActive) {
      return NextResponse.json({ accessGranted: true });
    }

    if (!page.customizations) {
      return NextResponse.json(
        { error: "Access restricted" },
        { status: 403 }
      );
    }

    try {
      const customizations = JSON.parse(page.customizations);
      const allowedEmails: string[] = Array.isArray(customizations.allowedEmails)
        ? customizations.allowedEmails
        : [];

      const normalizedList = allowedEmails.map((allowedEmail) =>
        allowedEmail.trim().toLowerCase()
      );

      if (normalizedList.includes(normalizedEmail)) {
        return NextResponse.json({ accessGranted: true });
      }
    } catch (error) {
      console.error("Failed to parse customizations for access control", error);
      return NextResponse.json(
        { error: "Access restricted" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Email not authorized" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error verifying feedback page access:", error);
    return NextResponse.json(
      { error: "Failed to verify access" },
      { status: 500 }
    );
  }
}


