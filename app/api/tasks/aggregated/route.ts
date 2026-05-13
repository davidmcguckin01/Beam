import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, feedbacks, customers } from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, isNotNull } from "drizzle-orm";

interface AggregatedTask {
  title: string;
  description: string;
  priority: string;
  status: string; // Most common status in the group
  estimatedTimeMinutes: number;
  score: number; // Weighted score based on customer values
  customerCount: number;
  highValueCustomerCount: number;
  totalAnnualValue: number;
  feedbackIds: string[];
  taskIds: string[];
  customerIds: string[]; // Track unique customer IDs
  customers: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    annualValue: number;
  }>; // Customer details
  createdAt: Date; // Creation date of the earliest task in the group
}

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
    const { workspace } = context;

    // Get all tasks with their feedback and customer info
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

    // Group tasks by similarity (title + description)
    const taskGroups: AggregatedTask[] = [];

    for (const row of allTasks) {
      const { task, feedback, customer } = row;

      // Calculate customer value
      let customerValue = 0;
      if (customer && customer.contractValue) {
        const contractValue = parseFloat(customer.contractValue);
        customerValue =
          customer.contractType === "yearly"
            ? contractValue
            : contractValue * 12;
      }

      // Check if this task is already in any group (avoid duplicates)
      const alreadyGrouped = taskGroups.some((group) =>
        group.taskIds.includes(task.id)
      );
      if (alreadyGrouped) {
        continue; // Skip this task, it's already in a group
      }

      // Find the best matching group (highest similarity)
      let bestMatch: { group: AggregatedTask; similarity: number } | null =
        null;
      const SIMILARITY_THRESHOLD = 0.75;

      for (const group of taskGroups) {
        // Calculate comprehensive similarity (title + description)
        const similarity = calculateTaskSimilarity(
          {
            title: task.title,
            description: task.description,
          },
          {
            title: group.title,
            description: group.description,
          }
        );

        if (similarity > SIMILARITY_THRESHOLD) {
          // Keep track of the best match
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { group, similarity };
          }
        }
      }

      // If we found a matching group, merge into it
      if (bestMatch) {
        const group = bestMatch.group;
        // Merge into existing group
        group.taskIds.push(task.id);
        if (!group.feedbackIds.includes(feedback.id)) {
          group.feedbackIds.push(feedback.id);
        }

        // Track unique customers
        const customerId = feedback.customerId || null;
        if (customerId) {
          // Only count if this is a new unique customer
          if (!group.customerIds.includes(customerId)) {
            group.customerIds.push(customerId);
            group.customerCount += 1;
            if (customerValue > 50000) {
              group.highValueCustomerCount += 1;
            }
            // Add customer details
            if (customer) {
              group.customers.push({
                id: customer.id,
                name: customer.name,
                email: customer.email,
                company: customer.company,
                annualValue: customerValue,
              });
            }
          }
        }
        // Note: We don't count anonymous feedback (no customerId) as a separate customer
        // This ensures customerCount reflects actual unique customers

        group.totalAnnualValue += customerValue;

        // Update priority to highest
        if (task.priority === "High" || group.priority === "High") {
          group.priority = "High";
        } else if (task.priority === "Medium" && group.priority === "Low") {
          group.priority = "Medium";
        }

        // Update status to most common (prefer done > in_progress > todo > backlog)
        const statusPriority = { done: 4, in_progress: 3, todo: 2, backlog: 1 };
        const currentPriority =
          statusPriority[group.status as keyof typeof statusPriority] || 0;
        const taskPriority =
          statusPriority[task.status as keyof typeof statusPriority] || 0;
        if (taskPriority > currentPriority) {
          group.status = task.status;
        }

        // Update estimated time to average
        group.estimatedTimeMinutes = Math.round(
          (group.estimatedTimeMinutes * (group.taskIds.length - 1) +
            task.estimatedTimeMinutes) /
            group.taskIds.length
        );

        // Merge descriptions if they're different
        if (
          !group.description.includes(task.description) &&
          !task.description.includes(group.description)
        ) {
          group.description = `${group.description}\n\nAdditional context: ${task.description}`;
        }

        // Recalculate score
        group.score = calculateScore(
          group.customerCount,
          group.highValueCustomerCount,
          group.totalAnnualValue,
          group.priority
        );

        // Update createdAt to earliest task date
        if (new Date(task.createdAt) < new Date(group.createdAt)) {
          group.createdAt = task.createdAt;
        }

        continue; // Skip creating a new group
      }

      // No matching group found, create a new one
      const score = calculateScore(
        1,
        customerValue > 50000 ? 1 : 0,
        customerValue,
        task.priority
      );

      const customerId = feedback.customerId || null;
      taskGroups.push({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status || "todo",
        estimatedTimeMinutes: task.estimatedTimeMinutes,
        score,
        customerCount: customerId ? 1 : 0,
        highValueCustomerCount: customerValue > 50000 ? 1 : 0,
        totalAnnualValue: customerValue,
        feedbackIds: [feedback.id],
        taskIds: [task.id],
        customerIds: customerId ? [customerId] : [],
        customers:
          customer && customerId
            ? [
                {
                  id: customer.id,
                  name: customer.name,
                  email: customer.email,
                  company: customer.company,
                  annualValue: customerValue,
                },
              ]
            : [],
        createdAt: task.createdAt,
      });
    }

    // Sort by displayOrder first, then by score (highest first)
    const aggregatedTasks = taskGroups.sort((a, b) => {
      // Get the minimum displayOrder from each group's tasks
      const aOrders = a.taskIds
        .map((taskId) => {
          const task = allTasks.find((row) => row.task.id === taskId);
          return task?.task.displayOrder;
        })
        .filter(
          (order): order is number => order !== null && order !== undefined
        );

      const bOrders = b.taskIds
        .map((taskId) => {
          const task = allTasks.find((row) => row.task.id === taskId);
          return task?.task.displayOrder;
        })
        .filter(
          (order): order is number => order !== null && order !== undefined
        );

      const aOrder = aOrders.length > 0 ? Math.min(...aOrders) : Infinity;
      const bOrder = bOrders.length > 0 ? Math.min(...bOrders) : Infinity;

      // If both have displayOrder, sort by that
      if (aOrder !== Infinity && bOrder !== Infinity) {
        return aOrder - bOrder;
      }
      // If only one has displayOrder, prioritize it
      if (aOrder !== Infinity) return -1;
      if (bOrder !== Infinity) return 1;
      // Otherwise, sort by score (highest first)
      return b.score - a.score;
    });

    return NextResponse.json({ tasks: aggregatedTasks });
  } catch (error) {
    console.error("Error aggregating tasks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while aggregating tasks",
      },
      { status: 500 }
    );
  }
}

// Comprehensive similarity calculation for tasks (title + description)
function calculateTaskSimilarity(
  task1: { title: string; description: string },
  task2: { title: string; description: string }
): number {
  // Normalize text
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ");

  const title1 = normalize(task1.title);
  const title2 = normalize(task2.title);
  const desc1 = normalize(task1.description);
  const desc2 = normalize(task2.description);

  // Check for exact match after normalization
  if (title1 === title2) {
    return 1.0;
  }

  // Check if one title is a substring of another (with some length threshold)
  const minLength = Math.min(title1.length, title2.length);
  if (minLength > 10) {
    if (title1.includes(title2) || title2.includes(title1)) {
      // If one is a substring, calculate similarity based on length ratio
      const lengthRatio = minLength / Math.max(title1.length, title2.length);
      if (lengthRatio > 0.7) {
        return 0.85; // High similarity for substring matches
      }
    }
  }

  // Calculate title similarity (weighted 60%)
  const titleSimilarity = calculateStringSimilarity(title1, title2);

  // Calculate description similarity (weighted 40%)
  const descSimilarity = calculateStringSimilarity(desc1, desc2);

  // Combined similarity score
  const combinedSimilarity = titleSimilarity * 0.6 + descSimilarity * 0.4;

  // Also check for word overlap (Jaccard similarity) as a secondary check
  const titleWords1 = new Set(title1.split(/\s+/).filter((w) => w.length > 2));
  const titleWords2 = new Set(title2.split(/\s+/).filter((w) => w.length > 2));
  const titleIntersection = new Set(
    [...titleWords1].filter((x) => titleWords2.has(x))
  );
  const titleUnion = new Set([...titleWords1, ...titleWords2]);
  const titleJaccard =
    titleUnion.size > 0 ? titleIntersection.size / titleUnion.size : 0;

  // Check for significant word overlap (if most words match, it's likely the same task)
  if (titleWords1.size > 0 && titleWords2.size > 0) {
    const wordOverlapRatio =
      titleIntersection.size / Math.min(titleWords1.size, titleWords2.size);
    if (wordOverlapRatio > 0.7 && titleIntersection.size >= 3) {
      // If 70%+ of words overlap and at least 3 words match, consider it highly similar
      return Math.max(combinedSimilarity, 0.8);
    }
  }

  // Use the maximum of combined similarity and Jaccard to catch cases where
  // tasks have similar meaning but different wording
  return Math.max(combinedSimilarity, titleJaccard * 0.9);
}

// String similarity calculation (Levenshtein distance normalized)
function calculateStringSimilarity(str1: string, str2: string): number {
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

// Calculate weighted score based on customer value and priority
function calculateScore(
  customerCount: number,
  highValueCustomerCount: number,
  totalAnnualValue: number,
  priority: string
): number {
  // Base score from customer count
  let score = customerCount * 10;

  // High-value customer multiplier (3x weight)
  score += highValueCustomerCount * 30;

  // Annual value contribution (normalized, $1000 = 1 point)
  score += totalAnnualValue / 1000;

  // Priority multiplier
  const priorityMultiplier = {
    High: 3,
    Medium: 2,
    Low: 1,
  };
  score *= priorityMultiplier[priority as keyof typeof priorityMultiplier] || 1;

  return Math.round(score);
}
