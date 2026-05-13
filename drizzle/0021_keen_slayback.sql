ALTER TABLE "feedback_submissions" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "ai_addon_seat_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "bonus_responses" integer DEFAULT 0 NOT NULL;