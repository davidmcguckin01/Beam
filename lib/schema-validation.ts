import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ${tableName} 
        AND column_name = ${columnName}
    `);
    return (result.rows as Array<{ column_name: string }>).length > 0;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Get all columns for a table
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    return (result.rows as Array<{ column_name: string }>).map((row) => row.column_name);
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error);
    return [];
  }
}

/**
 * Validate schema for feedback_page_views and feedback_submissions tables
 * Logs detected columns and warns about missing expected columns
 */
export async function validateFeedbackSchema(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    // Skip validation in test environment
    return;
  }

  try {
    console.log("🔍 Validating database schema for feedback tables...");

    // Check feedback_page_views
    const pageViewsColumns = await getTableColumns("feedback_page_views");
    console.log(`📊 feedback_page_views columns (${pageViewsColumns.length}):`, pageViewsColumns.join(", "));

    // Expected columns from migration 0007 (core)
    const expectedPageViewsCore = [
      "id",
      "feedback_page_id",
      "workspace_id",
      "ip_address",
      "country",
      "city",
      "user_agent",
      "referer",
      "time_on_page_seconds",
      "session_id",
      "created_at",
    ];

    // Expected columns from migration 0012 (geo enrichment)
    const expectedPageViewsGeo = [
      "state",
      "postal_code",
      "company_name",
      "company_domain",
      "company_industry",
      "isp",
      "connection_type",
      "latitude",
      "longitude",
    ];

    const missingCore = expectedPageViewsCore.filter((col) => !pageViewsColumns.includes(col));
    const missingGeo = expectedPageViewsGeo.filter((col) => !pageViewsColumns.includes(col));

    if (missingCore.length > 0) {
      console.error(`❌ feedback_page_views missing CORE columns:`, missingCore);
    }
    if (missingGeo.length > 0) {
      console.warn(`⚠️  feedback_page_views missing GEO columns (migration 0012 not applied):`, missingGeo);
    }
    if (missingCore.length === 0 && missingGeo.length === 0) {
      console.log("✅ feedback_page_views schema is complete");
    }

    // Check feedback_submissions
    const submissionsColumns = await getTableColumns("feedback_submissions");
    console.log(`📊 feedback_submissions columns (${submissionsColumns.length}):`, submissionsColumns.join(", "));

    // Expected columns from migration 0007 (core)
    const expectedSubmissionsCore = [
      "id",
      "feedback_page_id",
      "workspace_id",
      "submitter_name",
      "submitter_email",
      "feedback",
      "metadata",
      "ip_address",
      "country",
      "user_agent",
      "referer",
      "time_on_page_seconds",
      "created_at",
    ];

    // Expected columns from migration 0012 (geo enrichment)
    const expectedSubmissionsGeo = [
      "city",
      "state",
      "postal_code",
      "company_name",
      "company_domain",
      "company_industry",
      "isp",
      "connection_type",
      "latitude",
      "longitude",
    ];

    const missingSubmissionsCore = expectedSubmissionsCore.filter((col) => !submissionsColumns.includes(col));
    const missingSubmissionsGeo = expectedSubmissionsGeo.filter((col) => !submissionsColumns.includes(col));

    if (missingSubmissionsCore.length > 0) {
      console.error(`❌ feedback_submissions missing CORE columns:`, missingSubmissionsCore);
    }
    if (missingSubmissionsGeo.length > 0) {
      console.warn(`⚠️  feedback_submissions missing GEO columns (migration 0012 not applied):`, missingSubmissionsGeo);
    }
    if (missingSubmissionsCore.length === 0 && missingSubmissionsGeo.length === 0) {
      console.log("✅ feedback_submissions schema is complete");
    }

    console.log("🔍 Schema validation complete");
  } catch (error) {
    console.error("❌ Error during schema validation:", error);
    // Don't throw - we don't want to crash the app if validation fails
  }
}

