"use client";

import { useEffect } from "react";
import { captureGclid } from "@/lib/gclid-tracking";

/**
 * Client component to capture gclid from URL on all pages
 * This ensures gclid is captured regardless of entry point
 */
export function GclidCapture() {
  useEffect(() => {
    // Capture gclid on mount (page load)
    captureGclid();
  }, []);

  return null; // This component doesn't render anything
}

