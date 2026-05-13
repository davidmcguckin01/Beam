import type { MultiStepFormConfig, FormStep, FormField } from "./form-builder-types";

export function buildSystemPrompt(): string {
  return `You are an expert form builder AI. You generate and edit multi-step form configurations as JSON.

## RESPONSE FORMAT

Return a JSON object with two keys:
{
  "assistantMessage": "A short, friendly 1-2 sentence explanation of what you built or changed.",
  "formConfig": { ...the MultiStepFormConfig object... }
}

## FORM STRUCTURE

MultiStepFormConfig:
{
  "version": 1,
  "steps": [FormStep, ...]
}

Each FormStep:
{
  "id": "<random 7-char alphanumeric string>",
  "title": "Step title",
  "fields": [FormField, ...],
  "exitConditions": [],
  "defaultTarget": <optional, see below>
}

## DEFAULT TARGET (optional step-level field)

Controls what happens after a step when no exit conditions match:
- Omit (or null) = continue to next step in sequence (default behaviour)
- { "type": "end" } = end the form
- { "type": "url", "url": "https://example.com" } = redirect to URL

Use this for URL redirects (e.g., after a thank-you step, redirect to a website). Do NOT put URL redirects in exitConditions.

## FIELD TYPES

Each field MUST have: id (random 7-char string), type, label. Optional: placeholder, helpText, required (boolean).

1. "short_text" - Single-line text input. Extra: placeholder (string)
2. "long_text" - Multi-line textarea. Extra: placeholder (string)
3. "email" - Email input with validation. Extra: placeholder (string)
4. "number" - Numeric input. Extra: placeholder (string)
5. "rating" - Star or number rating.
   Extra REQUIRED: minValue (number), maxValue (number), ratingStyle ("stars" | "numbers")
   Common configs: 1-5 stars, 1-10 numbers, 0-10 NPS
6. "select" - Dropdown. Extra REQUIRED: options (string[]) - at least 2 options
7. "radio" - Multiple choice. Extra REQUIRED: options (string[]) - at least 2 options
8. "checkbox" - Single checkbox. No extra properties.
9. "statement" - Text block (no input). Extra REQUIRED: content (string). Optional: linkText, linkUrl.
10. "heading" - Section heading. No extra properties besides label.

## EXIT CONDITIONS (conditional branching between steps)

Use exitConditions to route users to different steps based on their answers. This is CRITICAL for creating smart, adaptive forms.
{
  "id": "<random 7-char string>",
  "fieldId": "<id of a field in this step>",
  "operator": "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "any",
  "value": <string or number>,
  "targetStepId": "<step id or 'end'>"
}

Rules:
- Only reference fields within the same step
- "heading" and "statement" fields cannot be used in conditions
- Numeric operators only for "rating" and "number" fields
- "any" means any value present (no value field needed)
- targetStepId must be a step id or "end" — never "url"
- Conditions are evaluated in order — the FIRST matching condition wins
- For radio/select fields, use "equals" to match specific option values
- For rating fields, use "greater_than"/"less_than" to branch on scores (e.g., low NPS vs high NPS)

## WHEN TO USE CONDITIONAL LOGIC

ALWAYS add exitConditions when the form has:
- Rating or NPS questions — branch on low vs high scores (e.g., rating <= 3 → "What went wrong?" step, rating > 3 → "What did you enjoy?" step)
- Yes/No or multiple choice questions where different answers should lead to different follow-up questions
- Qualification questions — route qualified leads to one path and others to a different path
- Satisfaction surveys — dig deeper on negative feedback, thank happy users quickly

Example: NPS survey with branching
Step 1: NPS rating (0-10)
  exitConditions: [
    { fieldId: "nps_field", operator: "less_than", value: 7, targetStepId: "detractors_step" },
    { fieldId: "nps_field", operator: "greater_than", value: 8, targetStepId: "promoters_step" }
  ]
Step 2 (detractors): "What could we improve?"
Step 3 (promoters): "What do you love about us?"

## ID GENERATION
Generate IDs as 7-character random alphanumeric strings (e.g., "a1b2c3d", "x9y8z7w").
NEVER reuse IDs. Every step and field must have a unique ID.

## GUIDELINES
- Keep forms focused and concise (typically 1-4 steps)
- Put related fields together in the same step
- Use clear, friendly labels
- Only mark fields as required when truly necessary
- Use statement fields for welcome messages or instructions
- Default to stars for rating (1-5, stars style) unless user specifies otherwise
- For NPS, use 0-10 numbers style
- assistantMessage should be conversational and mention what was built/changed`;
}

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export function buildMessages(
  prompt: string,
  mode: "generate" | "edit",
  conversationHistory: ConversationMessage[],
  currentFormConfig?: MultiStepFormConfig | null
): ConversationMessage[] {
  const messages: ConversationMessage[] = [...conversationHistory];

  if (mode === "generate") {
    messages.push({
      role: "user",
      content: `Create a new form based on this description:\n\n"${prompt}"\n\nReturn the JSON with assistantMessage and formConfig.`,
    });
  } else {
    messages.push({
      role: "user",
      content: `Here is the current form configuration:\n\n\`\`\`json\n${JSON.stringify(currentFormConfig, null, 2)}\n\`\`\`\n\nThe user wants to make this change:\n\n"${prompt}"\n\nReturn the COMPLETE updated form as JSON with assistantMessage and formConfig. Preserve all existing field IDs that haven't been removed.`,
    });
  }

  return messages;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function validateAndNormalizeFormConfig(
  raw: unknown
): MultiStepFormConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) return null;

  const seenIds = new Set<string>();

  function ensureUniqueId(id: unknown): string {
    let result = typeof id === "string" && id.length > 0 ? id : uid();
    while (seenIds.has(result)) {
      result = uid();
    }
    seenIds.add(result);
    return result;
  }

  const validFieldTypes = new Set([
    "short_text", "long_text", "email", "number", "rating",
    "select", "radio", "checkbox", "statement", "heading",
  ]);

  const steps: FormStep[] = (obj.steps as unknown[]).map((rawStep) => {
    const step = rawStep as Record<string, unknown>;
    const stepId = ensureUniqueId(step.id);

    const fields: FormField[] = (
      Array.isArray(step.fields) ? step.fields : []
    )
      .filter((f: unknown) => {
        const field = f as Record<string, unknown>;
        return field && validFieldTypes.has(field.type as string);
      })
      .map((rawField: unknown) => {
        const field = rawField as Record<string, unknown>;
        field.id = ensureUniqueId(field.id);
        if (field.required === undefined) field.required = false;
        if (field.type === "rating") {
          if (field.minValue === undefined) field.minValue = 1;
          if (field.maxValue === undefined) field.maxValue = 5;
          if (!field.ratingStyle) field.ratingStyle = "stars";
        }
        if ((field.type === "select" || field.type === "radio") && !Array.isArray(field.options)) {
          field.options = ["Option 1", "Option 2"];
        }
        if (field.type === "statement" && !field.content) {
          field.content = field.label || "Statement";
        }
        if (!field.label || typeof field.label !== "string") {
          field.label = "Untitled field";
        }
        return field as unknown as FormField;
      });

    // Validate defaultTarget
    let defaultTarget: FormStep["defaultTarget"];
    const dt = step.defaultTarget as Record<string, unknown> | undefined;
    if (dt?.type === "end") {
      defaultTarget = { type: "end" };
    } else if (dt?.type === "url" && typeof dt.url === "string" && dt.url) {
      defaultTarget = { type: "url", url: dt.url };
    } else if (dt?.type === "step" && typeof dt.stepId === "string" && dt.stepId) {
      defaultTarget = { type: "step", stepId: dt.stepId };
    }

    return {
      id: stepId,
      title: typeof step.title === "string" && step.title ? step.title : "Untitled Step",
      fields,
      exitConditions: Array.isArray(step.exitConditions)
        ? (step.exitConditions as unknown[]).map((c) => {
            const cond = c as Record<string, unknown>;
            return {
              id: ensureUniqueId(cond.id),
              fieldId: (cond.fieldId as string) || "",
              operator: (cond.operator as string) || "equals",
              value: cond.value as string | number | undefined,
              targetStepId: (cond.targetStepId as string) || "end",
            };
          })
        : [],
      ...(defaultTarget ? { defaultTarget } : {}),
    } as FormStep;
  });

  return { version: 1, steps };
}
