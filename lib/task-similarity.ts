import OpenAI from "openai";
import { Task } from "@/db/schema";
import { FeedbackTask } from "@/types";

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get embedding for a task's title and description
 */
async function getTaskEmbedding(task: {
  title: string;
  description: string;
}): Promise<number[]> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const text = `${task.title} ${task.description}`;

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Check if a new task is similar to any existing tasks
 * Returns the most similar task if similarity is above threshold, null otherwise
 */
export async function findSimilarTask(
  newTask: FeedbackTask,
  existingTasks: Task[],
  similarityThreshold: number = 0.75
): Promise<{ task: Task; similarity: number } | null> {
  if (existingTasks.length === 0) return null;

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      // Fall back to text-based similarity if API key is not available
      return findSimilarTaskFallback(newTask, existingTasks);
    }

    // Get embedding for the new task
    const newTaskEmbedding = await getTaskEmbedding({
      title: newTask.title,
      description: newTask.description,
    });

    // Get embeddings for all existing tasks (batch for efficiency)
    const existingTaskTexts = existingTasks.map((t) => ({
      title: t.title,
      description: t.description,
    }));

    const embeddingsResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: existingTaskTexts.map((t) => `${t.title} ${t.description}`),
    });

    // Find the most similar task
    let maxSimilarity = 0;
    let mostSimilarTask: Task | null = null;

    for (let i = 0; i < existingTasks.length; i++) {
      const similarity = cosineSimilarity(
        newTaskEmbedding,
        embeddingsResponse.data[i].embedding
      );

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarTask = existingTasks[i];
      }
    }

    if (maxSimilarity >= similarityThreshold && mostSimilarTask) {
      return { task: mostSimilarTask, similarity: maxSimilarity };
    }

    return null;
  } catch (error) {
    console.error("Error checking task similarity:", error);
    // If embedding fails, fall back to simple text comparison
    return findSimilarTaskFallback(newTask, existingTasks);
  }
}

/**
 * Fallback similarity check using simple text comparison
 * Used when OpenAI embeddings fail
 */
function findSimilarTaskFallback(
  newTask: FeedbackTask,
  existingTasks: Task[],
  similarityThreshold: number = 0.6
): { task: Task; similarity: number } | null {
  const newTaskText = `${newTask.title} ${newTask.description}`.toLowerCase();
  const newTaskWords = new Set(newTaskText.split(/\s+/));

  let maxSimilarity = 0;
  let mostSimilarTask: Task | null = null;

  for (const existingTask of existingTasks) {
    const existingTaskText =
      `${existingTask.title} ${existingTask.description}`.toLowerCase();
    const existingTaskWords = new Set(existingTaskText.split(/\s+/));

    // Calculate Jaccard similarity (intersection over union)
    const intersection = new Set(
      [...newTaskWords].filter((x) => existingTaskWords.has(x))
    );
    const union = new Set([...newTaskWords, ...existingTaskWords]);
    const similarity = intersection.size / union.size;

    // Also check if titles are very similar
    const titleSimilarity = calculateStringSimilarity(
      newTask.title.toLowerCase(),
      existingTask.title.toLowerCase()
    );

    const combinedSimilarity = Math.max(similarity, titleSimilarity * 0.8);

    if (combinedSimilarity > maxSimilarity) {
      maxSimilarity = combinedSimilarity;
      mostSimilarTask = existingTask;
    }
  }

  if (maxSimilarity >= similarityThreshold && mostSimilarTask) {
    return { task: mostSimilarTask, similarity: maxSimilarity };
  }

  return null;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
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
