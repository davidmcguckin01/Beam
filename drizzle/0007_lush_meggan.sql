CREATE TABLE "feedback_page_views" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_page_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"ip_address" text,
	"country" text,
	"city" text,
	"user_agent" text,
	"referer" text,
	"time_on_page_seconds" integer,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "referer" text;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "time_on_page_seconds" integer;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD CONSTRAINT "feedback_page_views_feedback_page_id_feedback_pages_id_fk" FOREIGN KEY ("feedback_page_id") REFERENCES "public"."feedback_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_page_views" ADD CONSTRAINT "feedback_page_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_page_view_page_id_idx" ON "feedback_page_views" USING btree ("feedback_page_id");--> statement-breakpoint
CREATE INDEX "feedback_page_view_workspace_id_idx" ON "feedback_page_views" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_page_view_created_at_idx" ON "feedback_page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_page_view_session_id_idx" ON "feedback_page_views" USING btree ("session_id");