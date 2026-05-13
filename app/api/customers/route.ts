import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, desc } from "drizzle-orm";

// GET all customers for the current workspace
export async function GET(request: NextRequest) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const allCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.workspaceId, context.workspace.id))
      .orderBy(desc(customers.createdAt));

    return NextResponse.json({ customers: allCustomers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching customers",
      },
      { status: 500 }
    );
  }
}

// POST create a new customer
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
    const {
      name,
      email,
      company,
      companyUrl,
      contractValue,
      contractType = "monthly",
      contractStartDate,
      contractEndDate,
      isActive = true,
      notes,
      faviconUrl,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    // Helper to safely parse dates - returns null if invalid/empty
    const parseDate = (dateValue: any): Date | null => {
      if (
        !dateValue ||
        dateValue === "" ||
        (typeof dateValue !== "string" && !(dateValue instanceof Date))
      ) {
        return null;
      }
      const parsed =
        dateValue instanceof Date ? dateValue : new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const normalizeUrl = (urlValue: any): string | null => {
      if (!urlValue || typeof urlValue !== "string") return null;
      const trimmed = urlValue.trim();
      if (!trimmed) return null;
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    };

    const parsedStartDate = parseDate(contractStartDate);
    const parsedEndDate = parseDate(contractEndDate);

    const [newCustomer] = await db
      .insert(customers)
      .values({
        workspaceId: context.workspace.id,
        userId: context.user.id,
        name: name.trim(),
        email: email?.trim() || null,
        company: company?.trim() || null,
        companyUrl: normalizeUrl(companyUrl),
        contractValue: contractValue ? String(contractValue) : null,
        contractType: contractType === "yearly" ? "yearly" : "monthly",
        contractStartDate: parsedStartDate ?? null,
        contractEndDate: parsedEndDate ?? null,
        isActive: isActive ?? true,
        notes: notes?.trim() || null,
        faviconUrl: faviconUrl?.trim() || null,
      })
      .returning();

    return NextResponse.json({ customer: newCustomer });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while creating customer",
      },
      { status: 500 }
    );
  }
}
