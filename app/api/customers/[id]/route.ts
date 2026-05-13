import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

// GET a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching customer",
      },
      { status: 500 }
    );
  }
}

// PATCH update a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;
    const body = await request.json();

    // Verify customer belongs to workspace
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Helper to safely parse dates - returns undefined if invalid/empty
    const parseDate = (dateValue: any): Date | undefined => {
      if (
        !dateValue ||
        dateValue === "" ||
        (typeof dateValue !== "string" && !(dateValue instanceof Date))
      ) {
        return undefined;
      }
      const parsed =
        dateValue instanceof Date ? dateValue : new Date(dateValue);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.company !== undefined)
      updateData.company = body.company?.trim() || null;
    if (body.contractValue !== undefined)
      updateData.contractValue = body.contractValue
        ? String(body.contractValue)
        : null;
    if (body.contractType !== undefined)
      updateData.contractType =
        body.contractType === "yearly" ? "yearly" : "monthly";
    if (body.contractStartDate !== undefined) {
      const parsedStartDate = parseDate(body.contractStartDate);
      updateData.contractStartDate =
        parsedStartDate !== undefined ? parsedStartDate : null;
    }
    if (body.contractEndDate !== undefined) {
      const parsedEndDate = parseDate(body.contractEndDate);
      updateData.contractEndDate =
        parsedEndDate !== undefined ? parsedEndDate : null;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.faviconUrl !== undefined)
      updateData.faviconUrl = body.faviconUrl?.trim() || null;

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while updating customer",
      },
      { status: 500 }
    );
  }
}

// DELETE a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;

    const { id } = await params;

    // Verify customer belongs to workspace
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.workspaceId, context.workspace.id)
        )
      )
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    await db.delete(customers).where(eq(customers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while deleting customer",
      },
      { status: 500 }
    );
  }
}
