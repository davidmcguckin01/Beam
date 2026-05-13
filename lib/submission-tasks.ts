import { db } from "@/db";
import { feedbacks, tasks as tasksTable, taskLogs, workspaces } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import OpenAI from "openai";
import { findSimilarTask } from "@/lib/task-similarity";

export async function createTasksFromSubmission(
  submission: any,
  feedbackText: string,
  workspaceId: string,
  feedbackId: string
) {
  if (!process.env.OPENAI_API_KEY) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  let workspaceContext = "";
  if (workspace) {
    const contextParts = [];
    if (workspace.companyName) contextParts.push(`Company: ${workspace.companyName}`);
    if (workspace.description) contextParts.push(`Company Description: ${workspace.description}`);
    if (workspace.internalUseCase) contextParts.push(`Internal Use Case: ${workspace.internalUseCase}`);
    if (contextParts.length > 0) {
      workspaceContext = `\n\nCOMPANY CONTEXT:\n${contextParts.join("\n\n")}\n\nUse this context to better understand the company's business, industry, and how they use this tool when interpreting feedback and generating tasks.`;
    }
  }

  const systemPrompt = `You are a senior product designer and project manager. Your job is to translate vague, messy client feedback into a clean, actionable to-do list for a designer. You must infer what the client probably means by emotional, vague language like "make it pop" or "needs more energy" and turn it into specific, concrete design tasks.${workspaceContext}`;

  const userPrompt = `Here is raw client feedback:

\`\`\`text
${feedbackText}
\`\`\`

1. Interpret what the client is asking for, even if they use vague or emotional language like "make it pop", "needs more energy", "feels off", "more modern", "too boring", etc.
2. Convert this into a list of concrete design tasks.
3. Each task must:

   * Have a short **title** describing the action.
   * Describe a specific, actionable design change in the **description** (e.g. "Increase headline contrast by ~40%", "Add 24px top padding around CTA", "Reduce hero illustration size by ~15%", "Switch body font to a sans-serif for better consistency").
   * Include a short **reason** that references the client's intent in simple language.
   * Have a **priority**: "High", "Medium", or "Low".
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) throw new Error("No response from OpenAI");

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(responseContent);
  } catch {
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Invalid JSON response from OpenAI");
    }
  }

  if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
    throw new Error("Invalid response structure from OpenAI");
  }

  const tasks = parsedResponse.tasks.map((task: any, index: number) => ({
    id: task.id ?? index + 1,
    title: task.title ?? "Untitled Task",
    description: task.description ?? "",
    reason: task.reason ?? "",
    priority:
      task.priority === "High" || task.priority === "Medium" || task.priority === "Low"
        ? task.priority
        : "Medium",
    estimatedTimeMinutes: task.estimatedTimeMinutes ?? 15,
  }));

  const existingTasks = await db
    .select()
    .from(tasksTable)
    .innerJoin(feedbacks, eq(tasksTable.feedbackId, feedbacks.id))
    .where(and(eq(feedbacks.workspaceId, workspaceId), ne(tasksTable.status, "done")))
    .then((results) => results.map((r) => r.tasks));

  for (const newTask of tasks) {
    const similarTaskResult = await findSimilarTask(newTask, existingTasks);

    if (similarTaskResult) {
      const existingTask = similarTaskResult.task;
      const previousValues = {
        title: existingTask.title,
        description: existingTask.description,
        reason: existingTask.reason,
        priority: existingTask.priority,
        estimatedTimeMinutes: existingTask.estimatedTimeMinutes,
      };

      const mergedDescription = existingTask.description.includes(newTask.description)
        ? existingTask.description
        : `${existingTask.description}\n\nAdditional context: ${newTask.description}`;

      const mergedReason = existingTask.reason.includes(newTask.reason)
        ? existingTask.reason
        : `${existingTask.reason}\n\nAdditional reason: ${newTask.reason}`;

      const priorityOrder = { Low: 1, Medium: 2, High: 3 };
      const newPriority =
        priorityOrder[newTask.priority as keyof typeof priorityOrder] >
        priorityOrder[existingTask.priority as keyof typeof priorityOrder]
          ? newTask.priority
          : existingTask.priority;

      await db
        .update(tasksTable)
        .set({
          description: mergedDescription,
          reason: mergedReason,
          priority: newPriority,
          estimatedTimeMinutes: Math.max(existingTask.estimatedTimeMinutes, newTask.estimatedTimeMinutes),
          updatedAt: new Date(),
        })
        .where(eq(tasksTable.id, existingTask.id));

      await db.insert(taskLogs).values({
        taskId: existingTask.id,
        action: "updated",
        changes: JSON.stringify({
          description: "Merged with similar task from feedback submission",
          reason: "Merged with similar task from feedback submission",
          priority: newPriority !== existingTask.priority ? `Changed from ${existingTask.priority} to ${newPriority}` : "No change",
          similarity: similarTaskResult.similarity,
          feedbackSubmissionId: submission.id,
        }),
        previousValues: JSON.stringify(previousValues),
        newValues: JSON.stringify({
          title: existingTask.title,
          description: mergedDescription,
          reason: mergedReason,
          priority: newPriority,
          estimatedTimeMinutes: Math.max(existingTask.estimatedTimeMinutes, newTask.estimatedTimeMinutes),
        }),
      });
    } else {
      const [createdTask] = await db
        .insert(tasksTable)
        .values({
          feedbackId: feedbackId,
          feedbackSubmissionId: submission.id,
          title: newTask.title,
          description: newTask.description,
          reason: newTask.reason,
          priority: newTask.priority,
          estimatedTimeMinutes: newTask.estimatedTimeMinutes,
        })
        .returning();

      if (createdTask) {
        await db.insert(taskLogs).values({
          taskId: createdTask.id,
          action: "created",
          changes: JSON.stringify({
            source: "New task extracted from feedback submission",
            feedbackId: feedbackId,
            feedbackSubmissionId: submission.id,
          }),
        });
      }
    }
  }
}
