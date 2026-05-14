CREATE TABLE "dashboard" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL REFERENCES "site"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "layout" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "dashboard_site_id_position_idx" ON "dashboard" ("site_id", "position");
--> statement-breakpoint
INSERT INTO "dashboard" ("site_id", "name", "position", "layout")
SELECT "id", 'Default', 0, "dashboard_layout"
FROM "site";
