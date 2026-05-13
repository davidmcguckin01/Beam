import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackPages } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/feedback-pages/slug/[slug] - Get a feedback page by slug (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    let requiresAccess = false;
    let sanitizedCustomizations = page.customizations;
    if (page.customizations) {
      try {
        const parsedCustomizations = JSON.parse(page.customizations);
        const allowedEmails = Array.isArray(parsedCustomizations.allowedEmails)
          ? parsedCustomizations.allowedEmails
          : [];
        if (!page.isActive) {
          if (allowedEmails.length === 0) {
            return NextResponse.json(
              { error: "Feedback page not available" },
              { status: 404 }
            );
          }
          requiresAccess = true;
          delete parsedCustomizations.allowedEmails;
          sanitizedCustomizations = JSON.stringify(parsedCustomizations);
        }
      } catch (error) {
        // If parsing fails and page is inactive, treat as unavailable
        if (!page.isActive) {
          return NextResponse.json(
            { error: "Feedback page not available" },
            { status: 404 }
          );
        }
      }
    } else if (!page.isActive) {
      return NextResponse.json(
        { error: "Feedback page not available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...page,
      customizations: sanitizedCustomizations,
      requiresAccess,
    });
  } catch (error) {
    console.error("Error fetching feedback page by slug:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback page" },
      { status: 500 }
    );
  }
}
