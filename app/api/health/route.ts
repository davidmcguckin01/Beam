import { NextResponse } from "next/server";
import { validateFeedbackSchema } from "@/lib/schema-validation";

// Run schema validation on first health check
let validationRun = false;

export async function GET() {
  // Run validation once per server instance
  if (!validationRun) {
    validationRun = true;
    // Run validation asynchronously (don't block the response)
    validateFeedbackSchema().catch((error) => {
      console.error("Schema validation error:", error);
    });
  }

  return NextResponse.json({ status: "ok" });
}

