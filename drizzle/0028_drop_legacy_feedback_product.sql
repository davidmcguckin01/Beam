-- Drop the legacy "feedback" / form-builder product. Ocholens (the AI traffic
-- analytics product) keeps its own beam_user / beam_org / beam_membership /
-- beam_invite / site / dashboard / event tables — none of these are touched.
-- CASCADE clears the foreign-key web between the legacy tables; IF EXISTS keeps
-- it safe to re-run.
DROP TABLE IF EXISTS "task_logs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tasks" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "form_config_versions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "feedback_page_views" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "feedback_submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "feedback_pages" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "feedbacks" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "credit_transactions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "people" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "companies" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "customers" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workspace_members" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workspaces" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "user_onboarding_profiles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "users" CASCADE;
