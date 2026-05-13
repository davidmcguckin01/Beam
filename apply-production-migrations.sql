-- Migration 0012: Add enriched data columns
-- Note: feedback_page_views already has "city" from migration 0007, so we only add "state" here
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "company_url" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_domain" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_industry" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "isp" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "connection_type" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "latitude" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "longitude" text;
-- feedback_submissions needs both city and state (neither existed before)
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_domain" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_industry" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "isp" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "connection_type" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "latitude" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "longitude" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "feedback_submission_id" text;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_feedback_submission_id_feedback_submissions_id_fk'
    ) THEN
        ALTER TABLE "tasks" 
        ADD CONSTRAINT "tasks_feedback_submission_id_feedback_submissions_id_fk" 
        FOREIGN KEY ("feedback_submission_id") 
        REFERENCES "public"."feedback_submissions"("id") 
        ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "feedback_submission_id_idx" ON "tasks" USING btree ("feedback_submission_id");

-- Migration 0013: Make user_id nullable
ALTER TABLE "feedbacks" ALTER COLUMN "user_id" DROP NOT NULL;

