CREATE TABLE "task_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"action" text NOT NULL,
	"changes" text NOT NULL,
	"previous_values" text,
	"new_values" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_log_id_idx" ON "task_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_log_created_at_idx" ON "task_logs" USING btree ("created_at");