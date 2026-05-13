import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, or, ilike, and } from "drizzle-orm";

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
    const { email, name } = body;

    if (!email && !name) {
      return NextResponse.json(
        { error: "Email or name is required" },
        { status: 400 }
      );
    }

    // Build search conditions - prioritize exact email match
    const searchConditions = [];
    if (email) {
      const emailTrimmed = email.trim().toLowerCase();
      // Try exact match first (case-insensitive)
      searchConditions.push(ilike(customers.email, emailTrimmed));
    }
    if (name) {
      searchConditions.push(ilike(customers.name, `%${name.trim()}%`));
    }

    // Combine workspace filter with search conditions
    const whereConditions = [
      eq(customers.workspaceId, context.workspace.id),
      ...(searchConditions.length > 0 ? [or(...searchConditions)] : []),
    ];

    const matchingCustomers = await db
      .select()
      .from(customers)
      .where(and(...whereConditions))
      .limit(10);

    return NextResponse.json({ customers: matchingCustomers });
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while searching customers",
      },
      { status: 500 }
    );
  }
}
