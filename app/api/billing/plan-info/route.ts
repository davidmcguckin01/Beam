import { NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import {
  getWorkspacePlanInfo,
  getMonthlyResponseUsage,
} from "@/lib/plan-gates";

export async function GET() {
  try {
    const contextResult = await requireWorkspaceContext();
    if ("error" in contextResult) {
      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      );
    }

    const { context } = contextResult;
    const info = await getWorkspacePlanInfo(context.workspace.id);
    const usage = await getMonthlyResponseUsage(context.workspace.id);

    return NextResponse.json({
      ...info,
      responseUsage: {
        used: usage.used,
        limit: usage.limit,
        bonusResponses: usage.bonusResponses,
        effectiveLimit: usage.effectiveLimit,
        remaining: usage.remaining,
        resetsAt: usage.resetsAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching plan info:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan info" },
      { status: 500 }
    );
  }
}
