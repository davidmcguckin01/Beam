-- Composite (site_id, kind, ts) index for the dashboard's per-kind,
-- 30-day-window event aggregations. Replaces the narrower
-- event_site_kind_idx, which it fully covers as a prefix.
--
-- CONCURRENTLY so the build never blocks writes to the event table — it
-- cannot run inside a transaction, hence each statement stands alone.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "event_site_kind_ts_idx" ON "event" ("site_id", "kind", "ts");
--> statement-breakpoint
DROP INDEX CONCURRENTLY IF EXISTS "event_site_kind_idx";
