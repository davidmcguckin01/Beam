import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?"
      );
    }
    _sql = neon(process.env.DATABASE_URL);
    _db = drizzle({ client: _sql });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});
