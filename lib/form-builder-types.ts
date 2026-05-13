export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "phone"
  | "address"
  | "rating"
  | "select"
  | "radio"
  | "checkbox"
  | "statement"
  | "heading";

interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
}

export interface ShortTextField extends BaseField { type: "short_text" }
export interface LongTextField extends BaseField { type: "long_text" }
export interface EmailField extends BaseField { type: "email" }
export interface NumberField extends BaseField { type: "number" }

export interface RatingField extends BaseField {
  type: "rating";
  minValue: number;
  maxValue: number;
  ratingStyle: "stars" | "numbers";
}

export interface SelectField extends BaseField {
  type: "select";
  options: string[];
}

export interface RadioField extends BaseField {
  type: "radio";
  options: string[];
}

export interface PhoneField extends BaseField {
  type: "phone";
  countryCode?: string;
}

export interface AddressField extends BaseField {
  type: "address";
  country?: string;
}

export interface CheckboxField extends BaseField {
  type: "checkbox";
}

export interface StatementField extends BaseField {
  type: "statement";
  content: string;
  linkText?: string;
  linkUrl?: string;
}

export interface HeadingField extends BaseField {
  type: "heading";
}

export type FormField =
  | ShortTextField
  | LongTextField
  | EmailField
  | NumberField
  | PhoneField
  | AddressField
  | RatingField
  | SelectField
  | RadioField
  | CheckboxField
  | StatementField
  | HeadingField;

export interface ExitCondition {
  id: string;
  fieldId: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "gte" | "lte" | "contains" | "any";
  value?: string | number;
  targetStepId: string; // step id or "end"
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  exitConditions?: ExitCondition[];
  /** What to do after this step when no exit condition matches. Absence = advance to next step in array. */
  defaultTarget?: { type: "end" | "url" | "step"; url?: string; stepId?: string };
}

export interface MultiStepFormConfig {
  steps: FormStep[];
  version: 1;
}

export type FieldValues = Record<string, unknown>;
export interface StatementFieldValue { shown: true; linkClicked: boolean }

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function createField(type: FieldType): FormField {
  const base: BaseField = {
    id: uid(),
    type,
    label: fieldTypeLabel(type),
    required: false,
  };
  if (type === "rating") {
    return { ...base, type: "rating", minValue: 1, maxValue: 5, ratingStyle: "stars" };
  }
  if (type === "select" || type === "radio") {
    return { ...base, type, options: ["Option 1", "Option 2"] } as SelectField | RadioField;
  }
  if (type === "statement") {
    return { ...base, type: "statement", content: "Thank you for your response!" };
  }
  if (type === "phone") {
    return { ...base, type: "phone", label: "Phone number", placeholder: "+1 (555) 000-0000", countryCode: "US" };
  }
  if (type === "address") {
    return { ...base, type: "address", label: "Address", placeholder: "Start typing your address…", country: "" };
  }
  return { ...base, type } as FormField;
}

export function createStep(title = "New step"): FormStep {
  return { id: uid(), title, fields: [], exitConditions: [] };
}

export function fieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: "Short text",
    long_text: "Long text",
    email: "Email",
    number: "Number",
    phone: "Phone",
    address: "Address",
    rating: "Rating",
    select: "Dropdown",
    radio: "Multiple choice",
    checkbox: "Checkbox",
    statement: "Statement",
    heading: "Heading",
  };
  return labels[type];
}

export function migrateToFormConfig(opts: {
  showNameField?: boolean;
  showEmailField?: boolean;
  requireEmail?: boolean;
}): MultiStepFormConfig {
  const fields: FormField[] = [];

  if (opts.showNameField !== false) {
    fields.push({
      id: "migrated_name",
      type: "short_text",
      label: "Name",
      placeholder: "Your name",
      required: false,
    });
  }

  if (opts.showEmailField !== false) {
    fields.push({
      id: "migrated_email",
      type: "email",
      label: "Email",
      placeholder: "you@example.com",
      required: opts.requireEmail ?? false,
    });
  }

  fields.push({
    id: "migrated_feedback",
    type: "long_text",
    label: "Feedback",
    placeholder: "Share your thoughts…",
    required: true,
  });

  return {
    version: 1,
    steps: [{ id: "migrated_step_1", title: "Your feedback", fields, exitConditions: [] }],
  };
}
