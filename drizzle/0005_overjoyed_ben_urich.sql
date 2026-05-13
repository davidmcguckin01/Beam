-- Create workspaces table first
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_clerk_organization_id_unique" UNIQUE("clerk_organization_id"),
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Create workspace_members table
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add workspace_id columns as nullable first
ALTER TABLE "customers" ADD COLUMN "workspace_id" text;
--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "workspace_id" text;
--> statement-breakpoint
-- Create indexes for workspace_id
CREATE INDEX "workspace_clerk_org_id_idx" ON "workspaces" USING btree ("clerk_organization_id");
--> statement-breakpoint
CREATE INDEX "workspace_slug_idx" ON "workspaces" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "workspace_member_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_member_user_id_idx" ON "workspace_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "workspace_member_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");
--> statement-breakpoint
CREATE INDEX "customer_workspace_id_idx" ON "customers" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "feedback_workspace_id_idx" ON "feedbacks" USING btree ("workspace_id");
--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Note: workspace_id foreign keys will be added after data migration
-- The NOT NULL constraints will be added after backfilling data
