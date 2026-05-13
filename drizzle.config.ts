import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" }); // fallback

// Convert Neon pooler URL to direct connection URL for drizzle-kit
// Pooler: ep-xxx-pooler.c-3.region.aws.neon.tech
// Direct: ep-xxx.region.aws.neon.tech
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL!;

  console.log("url", url);

  // If it's a pooler URL, convert to direct connection
  if (url.includes("-pooler")) {
    return url
      .replace("-pooler", "") // Remove -pooler
      .replace(/\.c-\d+\./, ".") // Remove .c-3. or similar (e.g., .c-1., .c-10.)
      .replace(/[&?]channel_binding=require/, ""); // Remove channel_binding parameter
  }

  return url;
};

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
