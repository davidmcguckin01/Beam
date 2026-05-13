export type TaskPriority = "High" | "Medium" | "Low";

export interface FeedbackTask {
  id: number;
  title: string; // short action summary
  description: string; // more detail if needed
  reason: string; // why this task exists (client quote/intent)
  priority: TaskPriority;
  estimatedTimeMinutes: number;
  wasUpdated?: boolean; // true if this task was updated from a similar existing task
  previousValues?: {
    title: string;
    description: string;
    reason: string;
    priority: TaskPriority;
    estimatedTimeMinutes: number;
  }; // previous values if task was updated
}
