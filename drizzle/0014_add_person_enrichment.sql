-- Migration 0014: Add People Data Labs person enrichment columns
-- These columns store enriched person data from PDL Person Enrichment API

-- Add person enrichment columns to feedback_submissions
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_title" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_company_name" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_company_domain" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_company_website" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_company_industry" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_company_location" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_start_date" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "job_end_date" text;
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_experience" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_education" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_profiles" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_skills" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_interests" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_languages" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_network_members" text; -- JSON array
ALTER TABLE "feedback_submissions" ADD COLUMN IF NOT EXISTS "person_raw_data" text; -- Full PDL response JSON

-- Add person enrichment columns to feedback_page_views (if email is available)
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_title" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_company_name" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_company_domain" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_company_website" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_company_industry" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_company_location" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_start_date" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "job_end_date" text;
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_experience" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_education" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_profiles" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_skills" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_interests" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_languages" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_network_members" text; -- JSON array
ALTER TABLE "feedback_page_views" ADD COLUMN IF NOT EXISTS "person_raw_data" text; -- Full PDL response JSON

