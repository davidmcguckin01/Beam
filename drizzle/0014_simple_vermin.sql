CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text,
	"domain" text,
	"industry" text,
	"employee_count" integer,
	"revenue" text,
	"location" text,
	"website" text,
	"linkedin_url" text,
	"twitter_url" text,
	"facebook_url" text,
	"description" text,
	"founded" integer,
	"plan_tier" text,
	"raw_enrichment_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_enriched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"company_id" text,
	"name" text,
	"email" text,
	"role" text,
	"department" text,
	"seniority" text,
	"linkedin_url" text,
	"raw_enrichment_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_enriched_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "raw_feedback" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "source" SET DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_company_name" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_company_domain" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_company_website" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_company_industry" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_company_location" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_start_date" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "job_end_date" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_experience" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_education" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_profiles" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_skills" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_interests" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_languages" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_network_members" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "person_raw_data" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_website" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_description" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_employees" integer;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_revenue" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_founded" integer;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_linkedin_url" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_twitter_url" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_facebook_url" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_employees_list" text;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD COLUMN "company_raw_data" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_company_name" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_company_domain" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_company_website" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_company_industry" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_company_location" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_start_date" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "job_end_date" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_experience" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_education" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_profiles" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_skills" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_interests" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_languages" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_network_members" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "person_raw_data" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_website" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_description" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_employees" integer;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_revenue" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_founded" integer;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_linkedin_url" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_twitter_url" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_facebook_url" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_employees_list" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "company_raw_data" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "feedback_page_id" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "person_id" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "raw_text" text;
--> statement-breakpoint
UPDATE "feedbacks" SET "raw_text" = "raw_feedback" WHERE "raw_text" IS NULL;
--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "raw_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "submitter_name" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "submitter_email" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "submitter_role" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "company_domain" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "plan_tier" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "sentiment" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "urgency" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "icp_score" integer;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "icp_match_label" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "value_score" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "suggested_owner" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "impact_estimate" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "effort_estimate" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_workspace_id_idx" ON "companies" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "company_domain_idx" ON "companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "company_workspace_domain_idx" ON "companies" USING btree ("workspace_id","domain");--> statement-breakpoint
CREATE INDEX "person_workspace_id_idx" ON "people" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "person_email_idx" ON "people" USING btree ("email");--> statement-breakpoint
CREATE INDEX "person_company_id_idx" ON "people" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "person_workspace_email_idx" ON "people" USING btree ("workspace_id","email");--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_feedback_page_id_feedback_pages_id_fk" FOREIGN KEY ("feedback_page_id") REFERENCES "public"."feedback_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_page_id_idx" ON "feedbacks" USING btree ("feedback_page_id");--> statement-breakpoint
CREATE INDEX "feedback_company_id_idx" ON "feedbacks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "feedback_person_id_idx" ON "feedbacks" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "feedback_value_score_idx" ON "feedbacks" USING btree ("value_score");--> statement-breakpoint
CREATE INDEX "feedback_icp_score_idx" ON "feedbacks" USING btree ("icp_score");--> statement-breakpoint
CREATE INDEX "feedback_sentiment_idx" ON "feedbacks" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "task_category_idx" ON "tasks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_impact_estimate_idx" ON "tasks" USING btree ("impact_estimate");