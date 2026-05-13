CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"stripe_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "ai_addon_stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "ai_addon_stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "ai_addon_status" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "enrichment_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transaction_workspace_id_idx" ON "credit_transactions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "credit_transaction_created_at_idx" ON "credit_transactions" USING btree ("created_at");