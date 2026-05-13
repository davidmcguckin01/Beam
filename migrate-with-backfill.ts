import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sqlClient });

async function main() {
  console.log("Running migrations...");

  // Run the migration (which adds nullable columns)
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migration completed. Backfilling existing data...");

  // For existing data, we'll create a default workspace per user
  // First, get all unique user IDs that have data
  const usersWithData = await db.execute(sql`
    SELECT DISTINCT user_id FROM customers
    UNION
    SELECT DISTINCT user_id FROM feedbacks
  `);

  // Create a default workspace for each user and backfill
  for (const row of usersWithData.rows as Array<{ user_id: string }>) {
    const userId = row.user_id;

    // Get user email for workspace name
    const userResult = await db.execute(sql`
      SELECT email FROM users WHERE id = ${userId}
    `);
    const userEmail = userResult.rows[0]?.email || "user";

    // Create a default workspace (we'll use a placeholder Clerk org ID)
    // In production, users should create workspaces through Clerk
    const workspaceId = crypto.randomUUID();
    const workspaceSlug = `workspace-${userId.slice(0, 8)}`;

    await db.execute(sql`
      INSERT INTO workspaces (id, clerk_organization_id, name, slug, created_at, updated_at)
      VALUES (${workspaceId}, ${`temp-${workspaceId}`}, ${`${userEmail}'s Workspace`}, ${workspaceSlug}, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // Add user as owner
    await db.execute(sql`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${workspaceId}, ${userId}, 'owner', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // Backfill customers
    await db.execute(sql`
      UPDATE customers
      SET workspace_id = ${workspaceId}
      WHERE user_id = ${userId} AND workspace_id IS NULL
    `);

    // Backfill feedbacks
    await db.execute(sql`
      UPDATE feedbacks
      SET workspace_id = ${workspaceId}
      WHERE user_id = ${userId} AND workspace_id IS NULL
    `);
  }

  console.log("Backfill completed. Adding NOT NULL constraints...");

  // Now make workspace_id NOT NULL
  await db.execute(sql`
    ALTER TABLE customers
    ALTER COLUMN workspace_id SET NOT NULL
  `);

  await db.execute(sql`
    ALTER TABLE feedbacks
    ALTER COLUMN workspace_id SET NOT NULL
  `);

  // Add foreign key constraints
  await db.execute(sql`
    ALTER TABLE customers
    ADD CONSTRAINT customers_workspace_id_workspaces_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE feedbacks
    ADD CONSTRAINT feedbacks_workspace_id_workspaces_id_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  `);

  console.log("Migrations completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
