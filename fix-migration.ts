import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sqlClient });

async function main() {
  console.log("Checking database state...");

  try {
    // Check if workspace_id columns exist
    const customersCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'workspace_id'
    `);

    const feedbacksCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'feedbacks' AND column_name = 'workspace_id'
    `);

    const hasCustomersWorkspaceId = customersCheck.rows.length > 0;
    const hasFeedbacksWorkspaceId = feedbacksCheck.rows.length > 0;

    console.log(`Customers workspace_id exists: ${hasCustomersWorkspaceId}`);
    console.log(`Feedbacks workspace_id exists: ${hasFeedbacksWorkspaceId}`);

    // Ensure favicon_url exists before later queries reference it
    const faviconCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'favicon_url'
    `);

    if (faviconCheck.rows.length === 0) {
      console.log("Adding favicon_url column to customers...");
      await db.execute(sql`
        ALTER TABLE customers ADD COLUMN favicon_url text
      `);
      console.log("✓ Added favicon_url column to customers");
    } else {
      console.log("✓ customers.favicon_url already exists");
    }

    const companyUrlCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name = 'company_url'
    `);

    if (companyUrlCheck.rows.length === 0) {
      console.log("Adding company_url column to customers...");
      await db.execute(sql`
        ALTER TABLE customers ADD COLUMN company_url text
      `);
      console.log("✓ Added company_url column to customers");
    } else {
      console.log("✓ customers.company_url already exists");
    }

    if (!hasCustomersWorkspaceId) {
      console.log("Adding workspace_id to customers (nullable)...");
      await db.execute(sql`
        ALTER TABLE customers ADD COLUMN workspace_id text
      `);
    }

    if (!hasFeedbacksWorkspaceId) {
      console.log("Adding workspace_id to feedbacks (nullable)...");
      await db.execute(sql`
        ALTER TABLE feedbacks ADD COLUMN workspace_id text
      `);
    }

    // Check if workspaces table has data
    const workspacesCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM workspaces
    `);
    const workspaceCount = parseInt(
      String(workspacesCheck.rows[0]?.count || "0")
    );

    console.log(`Existing workspaces: ${workspaceCount}`);

    if (workspaceCount === 0) {
      console.log("Creating default workspaces for existing users...");

      // Get all unique user IDs that have data
      const usersWithData = await db.execute(sql`
        SELECT DISTINCT user_id FROM customers
        UNION
        SELECT DISTINCT user_id FROM feedbacks
      `);

      console.log(`Found ${usersWithData.rows.length} users with data`);

      // Create a default workspace for each user
      for (const row of usersWithData.rows as Array<{ user_id: string }>) {
        const userId = row.user_id;

        // Get user email for workspace name
        const userResult = await db.execute(sql`
          SELECT email FROM users WHERE id = ${userId}
        `);
        const userEmail = userResult.rows[0]?.email || "user";

        // Create a default workspace
        const workspaceId = crypto.randomUUID();
        const workspaceSlug = `workspace-${userId.slice(0, 8)}`;
        const tempClerkOrgId = `temp-${workspaceId}`;

        await db.execute(sql`
          INSERT INTO workspaces (id, clerk_organization_id, name, slug, created_at, updated_at)
          VALUES (${workspaceId}, ${tempClerkOrgId}, ${`${userEmail}'s Workspace`}, ${workspaceSlug}, NOW(), NOW())
        `);

        // Add user as owner
        await db.execute(sql`
          INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
          VALUES (${crypto.randomUUID()}, ${workspaceId}, ${userId}, 'owner', NOW(), NOW())
        `);

        // Backfill customers
        const customersUpdated = await db.execute(sql`
          UPDATE customers
          SET workspace_id = ${workspaceId}
          WHERE user_id = ${userId} AND workspace_id IS NULL
        `);

        // Backfill feedbacks
        const feedbacksUpdated = await db.execute(sql`
          UPDATE feedbacks
          SET workspace_id = ${workspaceId}
          WHERE user_id = ${userId} AND workspace_id IS NULL
        `);

        console.log(`Created workspace for user ${userId}`);
      }
    } else {
      // Backfill any null workspace_ids
      console.log("Backfilling null workspace_ids...");

      // Get all workspaces and their members
      const workspaceMembers = await db.execute(sql`
        SELECT w.id as workspace_id, wm.user_id
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.role = 'owner'
      `);

      for (const row of workspaceMembers.rows as Array<{
        workspace_id: string;
        user_id: string;
      }>) {
        await db.execute(sql`
          UPDATE customers
          SET workspace_id = ${row.workspace_id}
          WHERE user_id = ${row.user_id} AND workspace_id IS NULL
        `);

        await db.execute(sql`
          UPDATE feedbacks
          SET workspace_id = ${row.workspace_id}
          WHERE user_id = ${row.user_id} AND workspace_id IS NULL
        `);
      }
    }

    // Check for any remaining null values
    const nullCustomers = await db.execute(sql`
      SELECT COUNT(*) as count FROM customers WHERE workspace_id IS NULL
    `);
    const nullFeedbacks = await db.execute(sql`
      SELECT COUNT(*) as count FROM feedbacks WHERE workspace_id IS NULL
    `);

    const nullCustomersCount = parseInt(
      String(nullCustomers.rows[0]?.count || "0")
    );
    const nullFeedbacksCount = parseInt(
      String(nullFeedbacks.rows[0]?.count || "0")
    );

    if (nullCustomersCount > 0 || nullFeedbacksCount > 0) {
      console.warn(
        `Warning: ${nullCustomersCount} customers and ${nullFeedbacksCount} feedbacks still have null workspace_id`
      );
      console.warn("These will need to be manually assigned or deleted.");
    } else {
      console.log("All data has been assigned to workspaces.");

      // Now make workspace_id NOT NULL
      console.log("Making workspace_id NOT NULL...");

      try {
        await db.execute(sql`
          ALTER TABLE customers
          ALTER COLUMN workspace_id SET NOT NULL
        `);
        console.log("✓ customers.workspace_id is now NOT NULL");
      } catch (e: any) {
        if (!e.message?.includes("already")) {
          console.warn(
            "Could not set customers.workspace_id to NOT NULL:",
            e.message
          );
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE feedbacks
          ALTER COLUMN workspace_id SET NOT NULL
        `);
        console.log("✓ feedbacks.workspace_id is now NOT NULL");
      } catch (e: any) {
        if (!e.message?.includes("already")) {
          console.warn(
            "Could not set feedbacks.workspace_id to NOT NULL:",
            e.message
          );
        }
      }
    }

    // Add foreign key constraints if they don't exist
    console.log("Adding foreign key constraints...");
    try {
      await db.execute(sql`
        ALTER TABLE customers
        ADD CONSTRAINT customers_workspace_id_workspaces_id_fk
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      `);
      console.log("✓ Added foreign key constraint to customers");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("✓ Foreign key constraint on customers already exists");
      } else {
        console.warn("Could not add foreign key to customers:", e.message);
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE feedbacks
        ADD CONSTRAINT feedbacks_workspace_id_workspaces_id_fk
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      `);
      console.log("✓ Added foreign key constraint to feedbacks");
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("✓ Foreign key constraint on feedbacks already exists");
      } else {
        console.warn("Could not add foreign key to feedbacks:", e.message);
      }
    }

    console.log("\n✅ Migration fix completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration fix failed!");
    console.error(err);
    process.exit(1);
  }
}

main();
