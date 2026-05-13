ALTER TABLE "feedback_submissions" ADD COLUMN "submitter_phone" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "submitter_address" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "submitter_phone" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "submitter_address" text;