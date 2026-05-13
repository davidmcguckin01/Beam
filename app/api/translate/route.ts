import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { FeedbackTask } from "@/types";
import { db } from "@/db";
import {
  feedbacks,
  tasks as tasksTable,
  customers,
  taskLogs,
} from "@/db/schema";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { eq, and, ne } from "drizzle-orm";
import { findSimilarTask } from "@/lib/task-similarity";

export async function POST(request: NextRequest) {
  try {
    // Get workspace context
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;
    const { user, workspace } = context;

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Initialize OpenAI client (only when API key is available)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse request body
    const body = await request.json();
    const {
      feedback,
      source = "text",
      customerId,
      preview = false,
      tasks: providedTasks,
    } = body;

    // Get customer info if customerId is provided
    let customer = null;
    let customerValue = 0;
    if (customerId) {
      const [customerData] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.workspaceId, workspace.id)
          )
        )
        .limit(1);

      if (customerData) {
        customer = customerData;
        // Calculate annual value
        const contractValue = customerData.contractValue
          ? parseFloat(customerData.contractValue)
          : 0;
        customerValue =
          customerData.contractType === "yearly"
            ? contractValue
            : contractValue * 12;
      }
    }

    // Validate feedback
    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return NextResponse.json(
        { error: "Feedback is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // If tasks are provided, use them instead of generating
    let tasks: FeedbackTask[] = [];
    if (
      providedTasks &&
      Array.isArray(providedTasks) &&
      providedTasks.length > 0
    ) {
      // Use provided tasks (edited by user)
      tasks = providedTasks.map((task: any, index: number) => ({
        id: task.id ?? index + 1,
        title: task.title ?? "Untitled Task",
        description: task.description ?? "",
        reason: task.reason ?? "",
        priority:
          task.priority === "High" ||
          task.priority === "Medium" ||
          task.priority === "Low"
            ? task.priority
            : "Medium",
        estimatedTimeMinutes: task.estimatedTimeMinutes ?? 15,
      }));
    } else {
      // Generate tasks using OpenAI
      // Build workspace context for prompt
      let workspaceContext = "";
      if (workspace) {
        const contextParts = [];
        
        if (workspace.companyName) {
          contextParts.push(`Company: ${workspace.companyName}`);
        }
        
        if (workspace.description) {
          contextParts.push(`Company Description: ${workspace.description}`);
        }
        
        if (workspace.internalUseCase) {
          contextParts.push(`Internal Use Case: ${workspace.internalUseCase}`);
        }
        
        if (contextParts.length > 0) {
          workspaceContext = `\n\nCOMPANY CONTEXT:\n${contextParts.join("\n\n")}\n\nUse this context to better understand the company's business, industry, and how they use this tool when interpreting feedback and generating tasks.`;
        }
      }

      // System prompt
      const systemPrompt = `You are a senior product designer and project manager. Your job is to translate vague, messy client feedback into a clean, actionable to-do list for a designer. You must infer what the client probably means by emotional, vague language like "make it pop" or "needs more energy" and turn it into specific, concrete design tasks.${workspaceContext}`;

      // Build customer context for prompt
      let customerContext = "";
      if (customer) {
        const contractInfo =
          customer.contractType === "yearly"
            ? `$${customer.contractValue}/year`
            : `$${customer.contractValue}/month`;
        customerContext = `\n\nIMPORTANT CONTEXT: This feedback is from ${
          customer.name
        }${
          customer.company ? ` at ${customer.company}` : ""
        } with a ${contractInfo} contract (Annual Value: $${customerValue.toLocaleString()}). `;

        if (customerValue > 50000) {
          customerContext +=
            "This is a HIGH-VALUE customer. Prioritize their feedback accordingly.";
        } else if (customerValue > 10000) {
          customerContext += "This is a medium-value customer.";
        }
      }

      // User prompt
      const userPrompt = `Here is raw client feedback:

\`\`\`text
${feedback}
\`\`\`${customerContext}

1. Interpret what the client is asking for, even if they use vague or emotional language like "make it pop", "needs more energy", "feels off", "more modern", "too boring", etc.
2. Convert this into a list of concrete design tasks.
3. Each task must:

   * Have a short **title** describing the action.
   * Describe a specific, actionable design change in the **description** (e.g. "Increase headline contrast by ~40%", "Add 24px top padding around CTA", "Reduce hero illustration size by ~15%", "Switch body font to a sans-serif for better consistency").
   * Include a short **reason** that references the client's intent in simple language.
   * Have a **priority**: "High", "Medium", or "Low". ${
     customerValue > 50000
       ? "For high-value customers, lean towards 'High' priority when the feedback is substantial."
       : ""
   }
   * Have an **estimatedTimeMinutes**: a rough estimate of how many minutes this will take a competent designer.

Output **only** valid JSON with the following TypeScript shape:

\`\`\`ts
interface FeedbackTask {
  id: number;
  title: string;
  description: string;
  reason: string;
  priority: "High" | "Medium" | "Low";
  estimatedTimeMinutes: number;
}
\`\`\`

The entire response should be:

\`\`\`json
{
  "tasks": FeedbackTask[]
}
\`\`\`

Do not include any explanation or extra text; only return JSON.`;

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using a cost-effective model, can be upgraded to gpt-4o if needed
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      // Parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        // Try to extract JSON from the response if it's wrapped in markdown or extra text
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Invalid JSON response from OpenAI");
        }
      }

      // Validate response structure
      if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
        throw new Error("Invalid response structure from OpenAI");
      }

      // Validate and ensure tasks have required fields
      tasks = parsedResponse.tasks.map((task: any, index: number) => ({
        id: task.id ?? index + 1,
        title: task.title ?? "Untitled Task",
        description: task.description ?? "",
        reason: task.reason ?? "",
        priority:
          task.priority === "High" ||
          task.priority === "Medium" ||
          task.priority === "Low"
            ? task.priority
            : "Medium",
        estimatedTimeMinutes: task.estimatedTimeMinutes ?? 15,
      }));

      // Adjust priority based on customer value (only for generated tasks, not edited ones)
      if (customerValue > 50000) {
        // High-value customers: upgrade Medium to High, Low to Medium
        tasks = tasks.map((task) => ({
          ...task,
          priority:
            task.priority === "Low"
              ? "Medium"
              : task.priority === "Medium"
              ? "High"
              : task.priority,
        }));
      } else if (customerValue > 10000) {
        // Medium-value customers: upgrade Low to Medium
        tasks = tasks.map((task) => ({
          ...task,
          priority: task.priority === "Low" ? "Medium" : task.priority,
        }));
      }
    }

    // Save feedback first (skip if preview mode)
    let savedFeedback = null;
    if (!preview) {
      const [insertedFeedback] = await db
        .insert(feedbacks)
        .values({
          workspaceId: workspace.id,
          userId: user.id,
          customerId: customerId || null,
          rawText: feedback, // Required field
          rawFeedback: feedback, // Keep for backward compatibility
          source: source as string,
        })
        .returning();

      if (!insertedFeedback) {
        throw new Error("Failed to save feedback");
      }
      savedFeedback = insertedFeedback;
    }

    // Get all existing tasks for this workspace (excluding done tasks for similarity checking)
    // Skip if preview mode
    const existingTasks = preview
      ? []
      : await db
          .select()
          .from(tasksTable)
          .innerJoin(feedbacks, eq(tasksTable.feedbackId, feedbacks.id))
          .where(
            and(
              eq(feedbacks.workspaceId, workspace.id),
              ne(tasksTable.status, "done")
            )
          )
          .then((results) => results.map((r) => r.tasks));

    // Process each new task: check for similarity and either update or create
    const processedTasks: Array<{
      id: string;
      title: string;
      description: string;
      reason: string;
      priority: string;
      estimatedTimeMinutes: number;
      wasUpdated: boolean;
      previousValues?: {
        title: string;
        description: string;
        reason: string;
        priority: string;
        estimatedTimeMinutes: number;
      };
    }> = [];

    for (let index = 0; index < tasks.length; index++) {
      const newTask = tasks[index];
      // Check for similar existing task
      const similarTaskResult = await findSimilarTask(newTask, existingTasks);

      if (similarTaskResult) {
        // Update existing task with more context
        const existingTask = similarTaskResult.task;
        const previousValues = {
          title: existingTask.title,
          description: existingTask.description,
          reason: existingTask.reason,
          priority: existingTask.priority,
          estimatedTimeMinutes: existingTask.estimatedTimeMinutes,
        };

        // Merge descriptions and reasons to add more context
        const mergedDescription = existingTask.description.includes(
          newTask.description
        )
          ? existingTask.description
          : `${existingTask.description}\n\nAdditional context: ${newTask.description}`;

        const mergedReason = existingTask.reason.includes(newTask.reason)
          ? existingTask.reason
          : `${existingTask.reason}\n\nAdditional reason: ${newTask.reason}`;

        // Use higher priority if new task has higher priority
        const priorityOrder = { Low: 1, Medium: 2, High: 3 };
        const newPriority =
          priorityOrder[newTask.priority as keyof typeof priorityOrder] >
          priorityOrder[existingTask.priority as keyof typeof priorityOrder]
            ? newTask.priority
            : existingTask.priority;

        const newValues = {
          title: existingTask.title, // Keep original title
          description: mergedDescription,
          reason: mergedReason,
          priority: newPriority,
          estimatedTimeMinutes: Math.max(
            existingTask.estimatedTimeMinutes,
            newTask.estimatedTimeMinutes
          ),
        };

        if (!preview && savedFeedback) {
          // Update the task
          await db
            .update(tasksTable)
            .set({
              description: newValues.description,
              reason: newValues.reason,
              priority: newValues.priority,
              estimatedTimeMinutes: newValues.estimatedTimeMinutes,
              updatedAt: new Date(),
            })
            .where(eq(tasksTable.id, existingTask.id));

          // Log the update
          await db.insert(taskLogs).values({
            taskId: existingTask.id,
            action: "updated",
            changes: JSON.stringify({
              description: "Merged with similar task from new feedback",
              reason: "Merged with similar task from new feedback",
              priority:
                newValues.priority !== existingTask.priority
                  ? `Changed from ${existingTask.priority} to ${newValues.priority}`
                  : "No change",
              estimatedTimeMinutes:
                newValues.estimatedTimeMinutes !==
                existingTask.estimatedTimeMinutes
                  ? `Updated from ${existingTask.estimatedTimeMinutes} to ${newValues.estimatedTimeMinutes}`
                  : "No change",
              similarity: similarTaskResult.similarity,
              sourceFeedbackId: savedFeedback.id,
            }),
            previousValues: JSON.stringify(previousValues),
            newValues: JSON.stringify(newValues),
          });
        }

        processedTasks.push({
          id: existingTask.id,
          ...newValues,
          wasUpdated: true,
          previousValues: previousValues,
        });
      } else {
        // Create new task
        if (!preview && savedFeedback) {
          const [createdTask] = await db
            .insert(tasksTable)
            .values({
              feedbackId: savedFeedback.id,
              title: newTask.title,
              description: newTask.description,
              reason: newTask.reason,
              priority: newTask.priority,
              estimatedTimeMinutes: newTask.estimatedTimeMinutes,
            })
            .returning();

          if (createdTask) {
            // Log the creation
            await db.insert(taskLogs).values({
              taskId: createdTask.id,
              action: "created",
              changes: JSON.stringify({
                source: "New task extracted from feedback",
                feedbackId: savedFeedback.id,
              }),
            });

            processedTasks.push({
              id: createdTask.id,
              title: createdTask.title,
              description: createdTask.description,
              reason: createdTask.reason,
              priority: createdTask.priority,
              estimatedTimeMinutes: createdTask.estimatedTimeMinutes,
              wasUpdated: false,
            });
          }
        } else {
          // Preview mode: just add to processedTasks without saving
          processedTasks.push({
            id: `preview-${index}`,
            title: newTask.title,
            description: newTask.description,
            reason: newTask.reason,
            priority: newTask.priority,
            estimatedTimeMinutes: newTask.estimatedTimeMinutes,
            wasUpdated: false,
          });
        }
      }
    }

    return NextResponse.json({
      tasks: processedTasks.map((t) => ({
        id:
          typeof t.id === "string" && t.id.startsWith("preview-")
            ? 0
            : parseInt(t.id) || 0, // For compatibility with frontend
        title: t.title,
        description: t.description,
        reason: t.reason,
        priority: t.priority,
        estimatedTimeMinutes: t.estimatedTimeMinutes,
        wasUpdated: t.wasUpdated,
        previousValues:
          t.wasUpdated && "previousValues" in t ? t.previousValues : undefined,
      })),
      feedbackId: savedFeedback?.id || null,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            company: customer.company,
            contractValue: customer.contractValue,
            contractType: customer.contractType,
            annualValue: customerValue,
          }
        : null,
      stats: {
        created: processedTasks.filter((t) => !t.wasUpdated).length,
        updated: processedTasks.filter((t) => t.wasUpdated).length,
        total: processedTasks.length,
      },
    });
  } catch (error) {
    console.error("Translation error:", error);

    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Invalid OpenAI API key" },
          { status: 500 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while translating feedback",
      },
      { status: 500 }
    );
  }
}
