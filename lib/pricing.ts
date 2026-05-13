export type PlanId = "starter" | "professional" | "business" | "enterprise";
export type BillingPeriod = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: string[];
  popular: boolean;
  custom: boolean; // true for business/enterprise (contact sales)
}

// Inline price data (no pre-created price IDs needed)
export const PLAN_PRICE_DATA: Record<PlanId, Record<BillingPeriod, { unitAmountCents: number; interval: "month" | "year" }>> = {
  starter: {
    monthly: { unitAmountCents: 2900, interval: "month" },   // $29/mo
    yearly:  { unitAmountCents: 22800, interval: "year" },    // $19/mo billed yearly ($228/yr)
  },
  professional: {
    monthly: { unitAmountCents: 9900, interval: "month" },    // $99/mo
    yearly:  { unitAmountCents: 70800, interval: "year" },    // $59/mo billed yearly ($708/yr)
  },
  business: {
    monthly: { unitAmountCents: 0, interval: "month" },
    yearly:  { unitAmountCents: 0, interval: "year" },
  },
  enterprise: {
    monthly: { unitAmountCents: 0, interval: "month" },
    yearly:  { unitAmountCents: 0, interval: "year" },
  },
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 19,
    popular: false,
    custom: false,
    features: [
      "AI-powered form builder",
      "500 responses/month",
      "Custom branding & themes",
      "1 workspace",
      "Basic analytics",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 99,
    yearlyPrice: 59,
    popular: true,
    custom: false,
    features: [
      "Everything in Starter, plus:",
      "2,000 responses/month",
      "Unlimited workspaces & forms",
      "Submission enrichment (company & geo data)",
      "Conditional logic & multi-step forms",
      "Advanced analytics & insights",
      "Priority support",
    ],
  },
];

export const SELF_SERVE_PLAN_IDS: PlanId[] = ["starter", "professional"];

// Monthly response limits per workspace (total across all forms)
// null = unlimited
export const PLAN_RESPONSE_LIMITS: Record<string, number | null> = {
  free: 50,
  starter: 500,
  professional: 2000,
  business: null,
  enterprise: null,
};

// Bonus responses granted per invited team member
export const INVITE_BONUS_RESPONSES = 50;

// AI add-on — per-account pricing
export const AI_ADDON_PRICES = {
  monthly: { unitAmountCents: 900, interval: "month" as const },   // $9/mo
  yearly:  { unitAmountCents: 7900, interval: "year" as const },   // ~$6.58/mo billed annually
};
