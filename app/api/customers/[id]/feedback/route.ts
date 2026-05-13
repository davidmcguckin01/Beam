import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks, customers, people, companies } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, desc } from "drizzle-orm";

// GET all feedback for a specific customer
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

    // Ensure customer belongs to workspace
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

    // Get all feedback for this customer
    const customerFeedback = await db
      .select()
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.customerId, id),
          eq(feedbacks.workspaceId, context.workspace.id)
        )
      )
      .orderBy(desc(feedbacks.createdAt));

    const latestFeedback = customerFeedback[0];

    let personProfile = null;
    if (latestFeedback?.personId) {
      const [person] = await db
        .select()
        .from(people)
        .where(eq(people.id, latestFeedback.personId))
        .limit(1);
      if (person) {
        personProfile = {
          name: person.name,
          email: person.email,
          role: person.role,
          seniority: person.seniority,
          linkedinUrl: person.linkedinUrl,
          lastUpdated: person.updatedAt,
        };
      }
    } else if (latestFeedback) {
      personProfile = {
        name: latestFeedback.submitterName,
        email: latestFeedback.submitterEmail,
        role: latestFeedback.submitterRole,
        seniority: null,
        linkedinUrl: null,
        lastUpdated: latestFeedback.updatedAt,
      };
    }

    let companyProfile = null;
    if (latestFeedback?.companyId) {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, latestFeedback.companyId))
        .limit(1);
      if (company) {
        companyProfile = {
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          employeeCount: company.employeeCount,
          revenue: company.revenue,
          website: company.website,
          linkedinUrl: company.linkedinUrl,
          lastUpdated: company.updatedAt,
        };
      }
    } else if (latestFeedback) {
      companyProfile = {
        name: latestFeedback.companyName,
        domain: latestFeedback.companyDomain,
        industry: null,
        employeeCount: null,
        revenue: null,
        website: null,
        linkedinUrl: null,
        lastUpdated: latestFeedback.updatedAt,
      };
    }

    const activityProfile = latestFeedback
      ? {
          lastSubmittedAt: latestFeedback.createdAt,
          source: latestFeedback.source,
          ipAddress: latestFeedback.ipAddress,
          planTier: latestFeedback.planTier,
        }
      : null;

    return NextResponse.json({
      feedback: customerFeedback,
      profile: {
        customer,
        person: personProfile,
        company: companyProfile,
        activity: activityProfile,
      },
    });
  } catch (error) {
    console.error("Error fetching customer feedback:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching customer feedback",
      },
      { status: 500 }
    );
  }
}
