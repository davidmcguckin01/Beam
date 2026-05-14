import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  decimal,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Use Web Crypto API which is available in both Node.js and Edge Runtime
const randomUUID = () => crypto.randomUUID();

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkIdIdx: index("clerk_id_idx").on(table.clerkId),
  })
);

// User onboarding profiles
export const userOnboardingProfiles = pgTable(
  "user_onboarding_profiles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    teamSize: text("team_size"), // "1-5" | "6-20" | "21-50" | "50+"
    feedbackMethod: text("feedback_method"), // "email" | "slack" | "spreadsheets" | "other" | "none"
    mainPainPoint: text("main_pain_point"), // "organization" | "prioritization" | "tracking" | "time" | "other"
    companySize: text("company_size"), // "startup" | "small" | "medium" | "enterprise"
    role: text("role"), // "customer_success" | "product" | "support" | "founder" | "other"
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_onboarding_profile_user_id_idx").on(table.userId),
  })
);

// Workspaces (linked to Clerk organizations)
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    clerkOrganizationId: text("clerk_organization_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    companyName: text("company_name"), // Company name
    companyUrl: text("company_url"), // Company website URL
    description: text("description"), // Company/project description
    internalUseCase: text("internal_use_case"), // What they're doing internally with the tool
    enrichmentCredits: integer("enrichment_credits").notNull().default(0),
    bonusResponses: integer("bonus_responses").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkOrgIdIdx: index("workspace_clerk_org_id_idx").on(
      table.clerkOrganizationId
    ),
    slugIdx: index("workspace_slug_idx").on(table.slug),
  })
);

// Workspace members (users in workspaces with roles)
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "owner" | "admin" | "member" | "viewer"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_member_workspace_id_idx").on(
      table.workspaceId
    ),
    userIdIdx: index("workspace_member_user_id_idx").on(table.userId),
    workspaceUserIdx: index("workspace_member_workspace_user_idx").on(
      table.workspaceId,
      table.userId
    ),
  })
);

export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    companyUrl: text("company_url"),
    faviconUrl: text("favicon_url"),
    contractValue: decimal("contract_value", { precision: 12, scale: 2 }), // Monthly or yearly value
    contractType: text("contract_type").notNull().default("monthly"), // "monthly" or "yearly"
    contractStartDate: timestamp("contract_start_date"),
    contractEndDate: timestamp("contract_end_date"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("customer_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("customer_user_id_idx").on(table.userId),
    nameIdx: index("customer_name_idx").on(table.name),
  })
);

// Companies table for deduplicated company records
// Keyed by workspaceId + domain to enable reuse across feedback entries
export const companies = pgTable(
  "companies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Company identification
    name: text("name"), // Company name
    domain: text("domain"), // Company domain (e.g., "example.com")
    // Enrichment data from external APIs (e.g., People Data Labs)
    industry: text("industry"),
    employeeCount: integer("employee_count"), // Number of employees
    revenue: text("revenue"), // Revenue range (e.g., "$10M-$50M")
    location: text("location"), // Primary location
    website: text("website"), // Company website URL
    linkedinUrl: text("linkedin_url"),
    twitterUrl: text("twitter_url"),
    facebookUrl: text("facebook_url"),
    description: text("description"), // Company description
    founded: integer("founded"), // Year founded
    planTier: text("plan_tier"), // Customer plan tier if known (e.g., "enterprise", "pro", "starter")
    // Raw enrichment data stored as JSON for future use
    rawEnrichmentData: text("raw_enrichment_data"), // Full API response JSON
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Last time we enriched this company
    lastEnrichedAt: timestamp("last_enriched_at"),
  },
  (table) => ({
    workspaceIdIdx: index("company_workspace_id_idx").on(table.workspaceId),
    domainIdx: index("company_domain_idx").on(table.domain),
    // Unique constraint: one company per workspace + domain combination
    workspaceDomainIdx: index("company_workspace_domain_idx").on(
      table.workspaceId,
      table.domain
    ),
  })
);

// People table for deduplicated person records
// Keyed by workspaceId + email to enable reuse across feedback entries
export const people = pgTable(
  "people",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    // Person identification
    name: text("name"), // Full name
    email: text("email"), // Email address (primary identifier)
    // Enrichment data from external APIs
    role: text("role"), // Job title/role
    department: text("department"),
    seniority: text("seniority"), // e.g., "C-level", "VP", "Director", "Manager", "Individual Contributor"
    linkedinUrl: text("linkedin_url"),
    // Raw enrichment data stored as JSON for future use
    rawEnrichmentData: text("raw_enrichment_data"), // Full API response JSON
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Last time we enriched this person
    lastEnrichedAt: timestamp("last_enriched_at"),
  },
  (table) => ({
    workspaceIdIdx: index("person_workspace_id_idx").on(table.workspaceId),
    emailIdx: index("person_email_idx").on(table.email),
    companyIdIdx: index("person_company_id_idx").on(table.companyId),
    // Unique constraint: one person per workspace + email combination
    workspaceEmailIdx: index("person_workspace_email_idx").on(
      table.workspaceId,
      table.email
    ),
  })
);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    // Link to feedback page if submitted from public page
    feedbackPageId: text("feedback_page_id").references(
      () => feedbackPages.id,
      {
        onDelete: "set null",
      }
    ),
    // Link to enriched company and person records
    companyId: text("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    personId: text("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    // Feedback content
    rawText: text("raw_text").notNull(), // Raw feedback text (alias for rawFeedback for clarity)
    rawFeedback: text("raw_feedback"), // Keep for backward compatibility
    source: text("source").notNull().default("manual"), // "feedback_page" | "manual" | "email" | "slack" | etc.
    // Optional customer info (can be stored here or linked via companyId/personId)
    // These fields allow quick access without joins, but companyId/personId are source of truth
    submitterName: text("submitter_name"),
    submitterEmail: text("submitter_email"),
    submitterRole: text("submitter_role"),
    companyName: text("company_name"), // Denormalized for quick access
    companyDomain: text("company_domain"), // Denormalized for quick access
    ipAddress: text("ip_address"),
    planTier: text("plan_tier"), // Denormalized from company
    // Status fields for scoring
    sentiment: text("sentiment"), // "positive" | "neutral" | "negative" | or numeric score
    urgency: text("urgency"), // "low" | "medium" | "high" | "critical"
    // ICP and value scoring
    icpScore: integer("icp_score"), // 0-100 ICP fit score
    icpMatchLabel: text("icp_match_label"), // "Strong ICP" | "Medium ICP" | "Non-ICP" | "Unknown"
    valueScore: integer("value_score"), // 0-100 overall value score
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("feedback_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("user_id_idx").on(table.userId),
    customerIdIdx: index("customer_id_idx").on(table.customerId),
    feedbackPageIdIdx: index("feedback_page_id_idx").on(table.feedbackPageId),
    companyIdIdx: index("feedback_company_id_idx").on(table.companyId),
    personIdIdx: index("feedback_person_id_idx").on(table.personId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    // Indexes for filtering and sorting
    valueScoreIdx: index("feedback_value_score_idx").on(table.valueScore),
    icpScoreIdx: index("feedback_icp_score_idx").on(table.icpScore),
    sentimentIdx: index("feedback_sentiment_idx").on(table.sentiment),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedbacks.id, { onDelete: "cascade" }),
    feedbackSubmissionId: text("feedback_submission_id").references(
      () => feedbackSubmissions.id,
      { onDelete: "set null" }
    ),
    title: text("title").notNull(),
    description: text("description").notNull(),
    reason: text("reason").notNull(), // Keep for backward compatibility
    // Task categorization and assignment
    category: text("category").notNull().default("other"), // "bug" | "feature_request" | "ux" | "support" | "other"
    suggestedOwner: text("suggested_owner"), // "engineering" | "product" | "design" | "cs" | "marketing"
    // Priority and estimates
    priority: text("priority").notNull(), // "High" | "Medium" | "Low"
    impactEstimate: text("impact_estimate").notNull().default("medium"), // "low" | "medium" | "high"
    effortEstimate: text("effort_estimate").notNull().default("medium"), // "low" | "medium" | "high"
    estimatedTimeMinutes: integer("estimated_time_minutes").notNull(),
    // Status and ordering
    status: text("status").notNull().default("todo"), // "todo" | "in_progress" | "done" | "backlog"
    displayOrder: integer("display_order"), // Custom display order for drag-and-drop
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    feedbackIdIdx: index("feedback_id_idx").on(table.feedbackId),
    feedbackSubmissionIdIdx: index("feedback_submission_id_idx").on(
      table.feedbackSubmissionId
    ),
    categoryIdx: index("task_category_idx").on(table.category),
    statusIdx: index("task_status_idx").on(table.status),
    impactEstimateIdx: index("task_impact_estimate_idx").on(
      table.impactEstimate
    ),
  })
);

export const taskLogs = pgTable(
  "task_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // "created" | "updated" | "merged"
    changes: text("changes").notNull(), // JSON string of what changed
    previousValues: text("previous_values"), // JSON string of previous values (for updates)
    newValues: text("new_values"), // JSON string of new values (for updates)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    taskIdIdx: index("task_log_id_idx").on(table.taskId),
    createdAtIdx: index("task_log_created_at_idx").on(table.createdAt),
  })
);

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  feedbacks: many(feedbacks),
  customers: many(customers),
  workspaceMemberships: many(workspaceMembers),
  onboardingProfile: one(userOnboardingProfiles),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [customers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  feedbacks: many(feedbacks),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [companies.workspaceId],
    references: [workspaces.id],
  }),
  people: many(people),
  feedbacks: many(feedbacks),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [people.workspaceId],
    references: [workspaces.id],
  }),
  company: one(companies, {
    fields: [people.companyId],
    references: [companies.id],
  }),
  feedbacks: many(feedbacks),
}));

export const feedbacksRelations = relations(feedbacks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [feedbacks.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [feedbacks.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [feedbacks.customerId],
    references: [customers.id],
  }),
  feedbackPage: one(feedbackPages, {
    fields: [feedbacks.feedbackPageId],
    references: [feedbackPages.id],
  }),
  company: one(companies, {
    fields: [feedbacks.companyId],
    references: [companies.id],
  }),
  person: one(people, {
    fields: [feedbacks.personId],
    references: [people.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  feedback: one(feedbacks, {
    fields: [tasks.feedbackId],
    references: [feedbacks.id],
  }),
  logs: many(taskLogs),
}));

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLogs.taskId],
    references: [tasks.id],
  }),
}));

export const userOnboardingProfilesRelations = relations(
  userOnboardingProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [userOnboardingProfiles.userId],
      references: [users.id],
    }),
  })
);

// Feedback Pages (customizable public feedback forms)
export const feedbackPages = pgTable(
  "feedback_pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id") // User who created the page
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    // Customization options (stored as JSON)
    customizations: text("customizations"), // JSON string with theme, colors, etc.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("feedback_page_workspace_id_idx").on(
      table.workspaceId
    ),
    userIdIdx: index("feedback_page_user_id_idx").on(table.userId),
    slugIdx: index("feedback_page_slug_idx").on(table.slug),
  })
);

// Feedback Submissions (from public feedback pages)
export const feedbackSubmissions = pgTable(
  "feedback_submissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    feedbackPageId: text("feedback_page_id")
      .notNull()
      .references(() => feedbackPages.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Submitter info (optional, for anonymous feedback)
    submitterName: text("submitter_name"),
    submitterEmail: text("submitter_email"),
    // Feedback content
    feedback: text("feedback").notNull(),
    // Analytics metadata
    ipAddress: text("ip_address"),
    country: text("country"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    companyName: text("company_name"),
    companyDomain: text("company_domain"),
    companyIndustry: text("company_industry"),
    isp: text("isp"),
    connectionType: text("connection_type"),
    latitude: text("latitude"), // Stored as text to handle precision
    longitude: text("longitude"), // Stored as text to handle precision
    userAgent: text("user_agent"),
    referer: text("referer"),
    timeOnPageSeconds: integer("time_on_page_seconds"),
    // Metadata
    metadata: text("metadata"), // JSON string for additional data
    // People Data Labs Person Enrichment
    jobTitle: text("job_title"),
    jobCompanyName: text("job_company_name"),
    jobCompanyDomain: text("job_company_domain"),
    jobCompanyWebsite: text("job_company_website"),
    jobCompanyIndustry: text("job_company_industry"),
    jobCompanyLocation: text("job_company_location"),
    jobStartDate: text("job_start_date"),
    jobEndDate: text("job_end_date"),
    personExperience: text("person_experience"), // JSON array
    personEducation: text("person_education"), // JSON array
    personProfiles: text("person_profiles"), // JSON array
    personSkills: text("person_skills"), // JSON array
    personInterests: text("person_interests"), // JSON array
    personLanguages: text("person_languages"), // JSON array
    personNetworkMembers: text("person_network_members"), // JSON array
    personRawData: text("person_raw_data"), // Full PDL response JSON
    // People Data Labs Company Enrichment
    companyWebsite: text("company_website"),
    companyDescription: text("company_description"),
    companyEmployees: integer("company_employees"),
    companyRevenue: text("company_revenue"),
    companyFounded: integer("company_founded"),
    companyLinkedinUrl: text("company_linkedin_url"),
    companyTwitterUrl: text("company_twitter_url"),
    companyFacebookUrl: text("company_facebook_url"),
    companyEmployeesList: text("company_employees_list"), // JSON array
    companyRawData: text("company_raw_data"), // Full PDL response JSON
    isDraft: boolean("is_draft").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    feedbackPageIdIdx: index("feedback_submission_page_id_idx").on(
      table.feedbackPageId
    ),
    workspaceIdIdx: index("feedback_submission_workspace_id_idx").on(
      table.workspaceId
    ),
    createdAtIdx: index("feedback_submission_created_at_idx").on(
      table.createdAt
    ),
  })
);

// Feedback Page Views (analytics for page visits)
export const feedbackPageViews = pgTable(
  "feedback_page_views",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    feedbackPageId: text("feedback_page_id")
      .notNull()
      .references(() => feedbackPages.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Analytics data
    ipAddress: text("ip_address"),
    country: text("country"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    companyName: text("company_name"),
    companyDomain: text("company_domain"),
    companyIndustry: text("company_industry"),
    isp: text("isp"),
    connectionType: text("connection_type"),
    latitude: text("latitude"), // Stored as text to handle precision
    longitude: text("longitude"), // Stored as text to handle precision
    userAgent: text("user_agent"),
    referer: text("referer"),
    timeOnPageSeconds: integer("time_on_page_seconds"),
    sessionId: text("session_id"), // To track unique visitors
    // People Data Labs Person Enrichment (if email available)
    jobTitle: text("job_title"),
    jobCompanyName: text("job_company_name"),
    jobCompanyDomain: text("job_company_domain"),
    jobCompanyWebsite: text("job_company_website"),
    jobCompanyIndustry: text("job_company_industry"),
    jobCompanyLocation: text("job_company_location"),
    jobStartDate: text("job_start_date"),
    jobEndDate: text("job_end_date"),
    personExperience: text("person_experience"), // JSON array
    personEducation: text("person_education"), // JSON array
    personProfiles: text("person_profiles"), // JSON array
    personSkills: text("person_skills"), // JSON array
    personInterests: text("person_interests"), // JSON array
    personLanguages: text("person_languages"), // JSON array
    personNetworkMembers: text("person_network_members"), // JSON array
    personRawData: text("person_raw_data"), // Full PDL response JSON
    // People Data Labs Company Enrichment
    companyWebsite: text("company_website"),
    companyDescription: text("company_description"),
    companyEmployees: integer("company_employees"),
    companyRevenue: text("company_revenue"),
    companyFounded: integer("company_founded"),
    companyLinkedinUrl: text("company_linkedin_url"),
    companyTwitterUrl: text("company_twitter_url"),
    companyFacebookUrl: text("company_facebook_url"),
    companyEmployeesList: text("company_employees_list"), // JSON array
    companyRawData: text("company_raw_data"), // Full PDL response JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    feedbackPageIdIdx: index("feedback_page_view_page_id_idx").on(
      table.feedbackPageId
    ),
    workspaceIdIdx: index("feedback_page_view_workspace_id_idx").on(
      table.workspaceId
    ),
    createdAtIdx: index("feedback_page_view_created_at_idx").on(
      table.createdAt
    ),
    sessionIdIdx: index("feedback_page_view_session_id_idx").on(
      table.sessionId
    ),
  })
);

// Form Config Versions (version history for form builder)
export const formConfigVersions = pgTable(
  "form_config_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    feedbackPageId: text("feedback_page_id")
      .notNull()
      .references(() => feedbackPages.id, { onDelete: "cascade" }),
    formConfig: text("form_config").notNull(), // JSON string of MultiStepFormConfig
    source: text("source").notNull().default("manual"), // "manual" | "ai_generate" | "ai_edit"
    prompt: text("prompt"), // The AI prompt that produced this version (null for manual saves)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    feedbackPageIdIdx: index("form_config_version_page_id_idx").on(
      table.feedbackPageId
    ),
    createdAtIdx: index("form_config_version_created_at_idx").on(
      table.createdAt
    ),
  })
);

// Credit transactions (for IP enrichment credit packs)
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // positive = purchase, negative = deduction
    type: text("type").notNull(), // "purchase" | "deduction"
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("credit_transaction_workspace_id_idx").on(table.workspaceId),
    createdAtIdx: index("credit_transaction_created_at_idx").on(table.createdAt),
  })
);

// Relations for feedback pages
export const feedbackPagesRelations = relations(
  feedbackPages,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [feedbackPages.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [feedbackPages.userId],
      references: [users.id],
    }),
    submissions: many(feedbackSubmissions),
    views: many(feedbackPageViews),
    feedbacks: many(feedbacks),
    configVersions: many(formConfigVersions),
  })
);

export const formConfigVersionsRelations = relations(
  formConfigVersions,
  ({ one }) => ({
    feedbackPage: one(feedbackPages, {
      fields: [formConfigVersions.feedbackPageId],
      references: [feedbackPages.id],
    }),
  })
);

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  customers: many(customers),
  feedbacks: many(feedbacks),
  feedbackPages: many(feedbackPages),
  feedbackSubmissions: many(feedbackSubmissions),
  feedbackPageViews: many(feedbackPageViews),
  companies: many(companies),
  people: many(people),
}));

export const feedbackSubmissionsRelations = relations(
  feedbackSubmissions,
  ({ one }) => ({
    feedbackPage: one(feedbackPages, {
      fields: [feedbackSubmissions.feedbackPageId],
      references: [feedbackPages.id],
    }),
    workspace: one(workspaces, {
      fields: [feedbackSubmissions.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const feedbackPageViewsRelations = relations(
  feedbackPageViews,
  ({ one }) => ({
    feedbackPage: one(feedbackPages, {
      fields: [feedbackPageViews.feedbackPageId],
      references: [feedbackPages.id],
    }),
    workspace: one(workspaces, {
      fields: [feedbackPageViews.workspaceId],
      references: [workspaces.id],
    }),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserOnboardingProfile = typeof userOnboardingProfiles.$inferSelect;
export type NewUserOnboardingProfile =
  typeof userOnboardingProfiles.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskLog = typeof taskLogs.$inferSelect;
export type NewTaskLog = typeof taskLogs.$inferInsert;
export type FeedbackPage = typeof feedbackPages.$inferSelect;
export type NewFeedbackPage = typeof feedbackPages.$inferInsert;
export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;
export type NewFeedbackSubmission = typeof feedbackSubmissions.$inferInsert;
export type FeedbackPageView = typeof feedbackPageViews.$inferSelect;
export type NewFeedbackPageView = typeof feedbackPageViews.$inferInsert;
export type FormConfigVersion = typeof formConfigVersions.$inferSelect;
export type NewFormConfigVersion = typeof formConfigVersions.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

// Workspace role types
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

// ---------------------------------------------------------------------------
// Beam: AI traffic analytics
// ---------------------------------------------------------------------------

// Beam users are mirrored from Clerk by clerk_user_id. We keep our own row so
// foreign keys, membership joins, and offline jobs don't have to call Clerk.
export const beamUser = pgTable("beam_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beamOrg = pgTable("beam_org", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// role: "owner" | "admin" | "member"
export const beamMembership = pgTable(
  "beam_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => beamUser.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => beamOrg.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userOrgIdx: index("beam_membership_user_org_idx").on(
      table.userId,
      table.orgId
    ),
    orgIdx: index("beam_membership_org_idx").on(table.orgId),
  })
);

export const beamInvite = pgTable(
  "beam_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => beamOrg.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => beamUser.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("beam_invite_org_idx").on(table.orgId),
    emailIdx: index("beam_invite_email_idx").on(table.email),
  })
);

export const site = pgTable("site", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => beamOrg.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  apiKey: text("api_key").notNull().unique(),
  // Detected platform: 'nextjs' | 'shopify' | 'wordpress' | 'webflow' |
  // 'framer' | 'wix' | 'squarespace' | 'ghost' | 'cloudflare-pages' |
  // 'vercel' | 'unknown' | null (not yet checked).
  stack: text("stack"),
  stackDetectedAt: timestamp("stack_detected_at"),
  // Dashboard widget layout (per-site, everyone in the org sees the same).
  // Stored as either a legacy `string[]` of widget keys or the structured
  // grid layout `{i,x,y,w,h}[]` used by react-grid-layout. resolveLayout in
  // lib/dashboard-widgets.ts handles both shapes. Null = use the default.
  dashboardLayout: jsonb("dashboard_layout").$type<unknown>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-site dashboard tabs. Each site has 1+ dashboards; each carries its
// own widget layout. The site.dashboard_layout column is kept for legacy
// reasons but is no longer the source of truth — resolveLayout migrates
// stored values transparently on first read.
export const dashboard = pgTable(
  "dashboard",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Display order within the site (0-indexed). Lower = leftmost tab.
    position: integer("position").notNull().default(0),
    // {i,x,y,w,h}[] — see lib/dashboard-widgets.ts.
    layout: jsonb("layout").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    siteIdPositionIdx: index("dashboard_site_id_position_idx").on(
      table.siteId,
      table.position
    ),
  })
);

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    ts: timestamp("ts").defaultNow().notNull(),
    url: text("url").notNull(),
    referrer: text("referrer"),
    // Lowercased hostname of the referrer (no www.), used for grouping non-AI
    // traffic in the dashboard. Null for direct visits / unparseable referrers.
    referrerHost: text("referrer_host"),
    // For humans: AI source name (ChatGPT, Claude, ...) or null.
    // For crawlers: extracted crawler family name (Googlebot, GPTBot, ...).
    source: text("source"),
    country: text("country"),
    // 'human' (default) for JS-pixel hits. 'crawler' for no-JS <img> beacon
    // requests from bots that don't run scripts AND server-side detected hits.
    kind: text("kind").notNull().default("human"),
    // Bot taxonomy. Populated for crawler rows; null for humans.
    // Vendor: 'openai' | 'anthropic' | 'google' | 'meta' | 'perplexity' | ...
    botVendor: text("bot_vendor"),
    // Category: 'training' | 'search' | 'user' | 'unknown'
    botCategory: text("bot_category"),
    // True if we cryptographically tied the request IP to the vendor's
    // published IP ranges. False = matched UA only, could be spoofed.
    verified: boolean("verified").notNull().default(false),
    asn: text("asn"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    siteIdTsIdx: index("event_site_id_ts_idx").on(table.siteId, table.ts),
    referrerHostIdx: index("event_site_referrer_host_idx").on(
      table.siteId,
      table.referrerHost
    ),
    // Composite (siteId, kind, ts) — serves the dashboard's per-kind,
    // 30-day-window aggregations (crawler/AI breakdowns) in a single index
    // range scan instead of a bitmap-AND of two narrower indexes, and still
    // covers plain (siteId, kind) lookups as a prefix. Supersedes the old
    // event_site_kind_idx.
    siteIdKindTsIdx: index("event_site_kind_ts_idx").on(
      table.siteId,
      table.kind,
      table.ts
    ),
    siteIdCategoryIdx: index("event_site_category_idx").on(
      table.siteId,
      table.botCategory
    ),
  })
);

export type BeamUser = typeof beamUser.$inferSelect;
export type NewBeamUser = typeof beamUser.$inferInsert;
export type BeamOrg = typeof beamOrg.$inferSelect;
export type NewBeamOrg = typeof beamOrg.$inferInsert;
export type BeamMembership = typeof beamMembership.$inferSelect;
export type NewBeamMembership = typeof beamMembership.$inferInsert;
export type BeamInvite = typeof beamInvite.$inferSelect;
export type NewBeamInvite = typeof beamInvite.$inferInsert;
export type Site = typeof site.$inferSelect;
export type NewSite = typeof site.$inferInsert;
export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;
