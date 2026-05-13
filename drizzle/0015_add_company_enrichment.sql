-- Migration 0015: Add People Data Labs company enrichment columns
-- These columns store enriched company data from PDL Company Enrichment API

-- Add company enrichment columns to feedback_submissions
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_website" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_description" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_employees" integer;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_revenue" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_founded" integer;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_linkedin_url" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_twitter_url" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_facebook_url" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_employees_list" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "company_raw_data" text; -- Full PDL response JSON

-- Add company enrichment columns to feedback_page_views
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_website" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_description" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_employees" integer;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_revenue" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_founded" integer;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_linkedin_url" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_twitter_url" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_facebook_url" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_employees_list" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "company_raw_data" text; -- Full PDL response JSON

