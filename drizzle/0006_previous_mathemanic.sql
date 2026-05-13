CREATE TABLE "feedback_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"customizations" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "feedback_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_page_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"submitter_name" text,
	"submitter_email" text,
	"feedback" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_pages" ADD CONSTRAINT "feedback_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_pages" ADD CONSTRAINT "feedback_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_feedback_page_id_feedback_pages_id_fk" FOREIGN KEY ("feedback_page_id") REFERENCES "public"."feedback_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_page_workspace_id_idx" ON "feedback_pages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_page_slug_idx" ON "feedback_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "feedback_submission_page_id_idx" ON "feedback_submissions" USING btree ("feedback_page_id");--> statement-breakpoint
CREATE INDEX "feedback_submission_workspace_id_idx" ON "feedback_submissions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_submission_created_at_idx" ON "feedback_submissions" USING btree ("created_at");