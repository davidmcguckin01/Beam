import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, feedbacks, tasks } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, desc } from "drizzle-orm";

interface CustomerOverview {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  contractValue: string | null;
  contractType: "monthly" | "yearly";
  isActive: boolean;
  feedbackCount: number;
  taskCount: number;
  annualValue: number;
}

interface ConsistentFeedback {
  title: string;
  description: string;
  customerCount: number;
  customerIds: string[];
  customerNames: string[];
  taskCount: number;
  priority: string;
  avgAnnualValue: number;
  consistencyScore: number; // Higher = more consistent across customers
}

export async function GET(request: NextRequest) {
  try {
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { context } = result;
    const { workspace } = context;

    // Get all customers with their feedback and task counts
    const allCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.workspaceId, workspace.id))
      .orderBy(desc(customers.createdAt));

    // Get all feedback with customer info
    const allFeedback = await db
      .select({
        feedback: feedbacks,
        customer: customers,
      })
      .from(feedbacks)
      .leftJoin(customers, eq(feedbacks.customerId, customers.id))
      .where(eq(feedbacks.workspaceId, workspace.id));

    // Get all tasks with their feedback
    const allTasks = await db
      .select({
        task: tasks,
        feedback: feedbacks,
        customer: customers,
      })
      .from(tasks)
      .innerJoin(feedbacks, eq(tasks.feedbackId, feedbacks.id))
      .leftJoin(customers, eq(feedbacks.customerId, customers.id))
      .where(eq(feedbacks.workspaceId, workspace.id));

    // Build customer overview with counts
    const customerOverview: CustomerOverview[] = allCustomers.map((customer) => {
      const customerFeedback = allFeedback.filter(
        (f) => f.feedback.customerId === customer.id
      );
      const customerTasks = allTasks.filter(
        (t) => t.feedback.customerId === customer.id
      );

      const contractValue = customer.contractValue
        ? parseFloat(customer.contractValue)
        : 0;
      const annualValue =
        customer.contractType === "yearly"
          ? contractValue
          : contractValue * 12;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        contractValue: customer.contractValue,
        contractType: customer.contractType as "monthly" | "yearly",
        isActive: customer.isActive,
        feedbackCount: customerFeedback.length,
        taskCount: customerTasks.length,
        annualValue,
      };
    });

    // Find consistent feedback across customers
    // Group tasks by similar title (normalized)
    const taskGroups = new Map<string, {
      title: string;
      description: string;
      customerIds: Set<string>;
      customerNames: Set<string>;
      taskIds: string[];
      priorities: string[];
      annualValues: number[];
    }>();

    for (const row of allTasks) {
      const { task, customer } = row;
      const normalizedTitle = task.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

      // Find similar group
      let foundGroup = false;
      for (const [key, group] of taskGroups.entries()) {
        const similarity = calculateSimilarity(normalizedTitle, key);
        if (similarity > 0.7) {
          // 70% similarity threshold
          group.customerIds.add(customer?.id || "unknown");
          if (customer) {
            group.customerNames.add(customer.name);
          }
          group.taskIds.push(task.id);
          group.priorities.push(task.priority);
          if (customer) {
            const contractValue = customer.contractValue
              ? parseFloat(customer.contractValue)
              : 0;
            const annualValue =
              customer.contractType === "yearly"
                ? contractValue
                : contractValue * 12;
            group.annualValues.push(annualValue);
          }
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        const customerIds = new Set<string>();
        const customerNames = new Set<string>();
        if (customer) {
          customerIds.add(customer.id);
          customerNames.add(customer.name);
        }

        const annualValues: number[] = [];
        if (customer) {
          const contractValue = customer.contractValue
            ? parseFloat(customer.contractValue)
            : 0;
          const annualValue =
            customer.contractType === "yearly"
              ? contractValue
              : contractValue * 12;
          annualValues.push(annualValue);
        }

        taskGroups.set(normalizedTitle, {
          title: task.title,
          description: task.description,
          customerIds,
          customerNames,
          taskIds: [task.id],
          priorities: [task.priority],
          annualValues,
        });
      }
    }

    // Convert to consistent feedback array and calculate scores
    const consistentFeedback: ConsistentFeedback[] = Array.from(
      taskGroups.values()
    )
      .map((group) => {
        const customerCount = group.customerIds.size;
        const taskCount = group.taskIds.length;
        const avgAnnualValue =
          group.annualValues.length > 0
            ? group.annualValues.reduce((a, b) => a + b, 0) /
              group.annualValues.length
            : 0;

        // Consistency score: higher when more customers have the same feedback
        // Weighted by customer value and number of occurrences
        const consistencyScore =
          customerCount * 10 + // Base score from customer count
          taskCount * 2 + // Bonus for multiple occurrences
          (avgAnnualValue / 1000) * 0.5; // Weight by customer value

        // Get most common priority
        const priorityCounts: Record<string, number> = {};
        group.priorities.forEach((p) => {
          priorityCounts[p] = (priorityCounts[p] || 0) + 1;
        });
        const mostCommonPriority = Object.entries(priorityCounts).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || "Medium";

        return {
          title: group.title,
          description: group.description,
          customerCount,
          customerIds: Array.from(group.customerIds),
          customerNames: Array.from(group.customerNames),
          taskCount,
          priority: mostCommonPriority,
          avgAnnualValue,
          consistencyScore: Math.round(consistencyScore),
        };
      })
      .filter((item) => item.customerCount > 1) // Only show feedback from 2+ customers
      .sort((a, b) => b.consistencyScore - a.consistencyScore); // Sort by consistency score

    // Calculate summary stats
    const totalCustomers = customerOverview.filter((c) => c.isActive).length;
    const totalFeedback = allFeedback.length;
    const totalTasks = allTasks.length;
    const highValueCustomers = customerOverview.filter(
      (c) => c.isActive && c.annualValue > 50000
    ).length;
    const totalAnnualValue = customerOverview
      .filter((c) => c.isActive)
      .reduce((sum, c) => sum + c.annualValue, 0);

    return NextResponse.json({
      customers: customerOverview,
      consistentFeedback: consistentFeedback.slice(0, 10), // Top 10 most consistent
      stats: {
        totalCustomers,
        totalFeedback,
        totalTasks,
        highValueCustomers,
        totalAnnualValue,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching dashboard overview",
      },
      { status: 500 }
    );
  }
}

// Simple similarity calculation (Levenshtein distance normalized)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

