// Legacy feedback-app plan gates. All gates resolve to "unlimited, all
// features on" — the legacy app is effectively free for everyone. Function
// signatures are preserved so existing call sites keep compiling.

import { db } from "@/db";
import {
  workspaces,
  creditTransactions,
  feedbackSubmissions,
} from "@/db/schema";
import { eq, sql, and, gte, count } from "drizzle-orm";

export const FREE_FORM_LIMIT = Number.POSITIVE_INFINITY;
export const FREE_SUBMISSION_LIMIT = Number.POSITIVE_INFINITY;

export interface WorkspacePlanInfo {
  plan: string | null;
  status: string | null;
  enrichmentCredits: number;
  bonusResponses: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export async function getWorkspacePlanInfo(
  workspaceId: string
): Promise<WorkspacePlanInfo> {
  const [ws] = await db
    .select({
      enrichmentCredits: workspaces.enrichmentCredits,
      bonusResponses: workspaces.bonusResponses,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return {
    plan: null,
    status: null,
    enrichmentCredits: ws?.enrichmentCredits ?? 0,
    bonusResponses: ws?.bonusResponses ?? 0,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}

export async function hasActivePaidPlan(_workspaceId: string): Promise<boolean> {
  return true;
}

export async function hasUnlimitedForms(_workspaceId: string): Promise<boolean> {
  return true;
}

/** @deprecated Use getMonthlyResponseUsage instead */
export async function hasUnlimitedSubmissions(
  _workspaceId: string
): Promise<boolean> {
  return true;
}

export async function hasAIPlan(
  _workspaceId: string,
  _userId?: string
): Promise<boolean> {
  return true;
}

// ── Monthly response usage (still tracked for analytics, no limits enforced) ─

export interface MonthlyResponseUsage {
  used: number;
  limit: number | null; // null = unlimited
  bonusResponses: number;
  effectiveLimit: number | null;
  remaining: number | null; // null if unlimited
  resetsAt: Date;
}

export async function getMonthlyResponseUsage(
  workspaceId: string
): Promise<MonthlyResponseUsage> {
  const info = await getWorkspacePlanInfo(workspaceId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ value: used }] = await db
    .select({ value: count() })
    .from(feedbackSubmissions)
    .where(
      and(
        eq(feedbackSubmissions.workspaceId, workspaceId),
        eq(feedbackSubmissions.isDraft, false),
        gte(feedbackSubmissions.createdAt, monthStart)
      )
    );

  return {
    used,
    limit: null,
    bonusResponses: info.bonusResponses,
    effectiveLimit: null,
    remaining: null,
    resetsAt,
  };
}

export async function canAcceptResponse(_workspaceId: string): Promise<boolean> {
  return true;
}

// ── Enrichment credits (still workspace-level, independent of billing) ──────

export async function deductCredit(
  workspaceId: string,
  description: string
): Promise<boolean> {
  const result = await db
    .update(workspaces)
    .set({
      enrichmentCredits: sql`${workspaces.enrichmentCredits} - 1`,
    })
    .where(eq(workspaces.id, workspaceId))
    .returning({ enrichmentCredits: workspaces.enrichmentCredits });

  if (!result.length || result[0].enrichmentCredits < 0) {
    if (result.length && result[0].enrichmentCredits < 0) {
      await db
        .update(workspaces)
        .set({ enrichmentCredits: 0 })
        .where(eq(workspaces.id, workspaceId));
    }
    return false;
  }

  await db.insert(creditTransactions).values({
    workspaceId,
    amount: -1,
    type: "deduction",
    description,
  });

  return true;
}

export async function addCredits(
  workspaceId: string,
  amount: number
): Promise<void> {
  await db
    .update(workspaces)
    .set({
      enrichmentCredits: sql`${workspaces.enrichmentCredits} + ${amount}`,
    })
    .where(eq(workspaces.id, workspaceId));

  await db.insert(creditTransactions).values({
    workspaceId,
    amount,
    type: "purchase",
    description: `Granted ${amount} enrichment credits`,
  });
}
