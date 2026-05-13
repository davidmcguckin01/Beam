CREATE TABLE "form_config_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_page_id" text NOT NULL,
	"form_config" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_config_versions" ADD CONSTRAINT "form_config_versions_feedback_page_id_feedback_pages_id_fk" FOREIGN KEY ("feedback_page_id") REFERENCES "public"."feedback_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_config_version_page_id_idx" ON "form_config_versions" USING btree ("feedback_page_id");--> statement-breakpoint
CREATE INDEX "form_config_version_created_at_idx" ON "form_config_versions" USING btree ("created_at");