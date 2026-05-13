"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once on the client side
    if (typeof window !== "undefined" && !initialized.current) {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

      if (!posthogKey) {
        console.warn("NEXT_PUBLIC_POSTHOG_KEY is not set. PostHog will not be initialized.");
        return;
      }

      try {
        posthog.init(posthogKey, {
          api_host: posthogHost || "https://us.i.posthog.com",
          defaults: "2025-05-24",
          // Enable session replay
          loaded: (posthog) => {
            console.log("PostHog initialized successfully");
            if (process.env.NODE_ENV === "development") {
              console.log("PostHog API Host:", posthogHost || "https://us.i.posthog.com");
              console.log("PostHog Key:", posthogKey.substring(0, 10) + "...");
            }
          },
          // Enable debug mode in development
          debug: process.env.NODE_ENV === "development",
          // Capture pageviews automatically
          capture_pageview: true,
          // Capture pageleaves automatically
          capture_pageleave: true,
        });
        initialized.current = true;
      } catch (error) {
        console.error("Error initializing PostHog:", error);
      }
    }
  }, []);

  return <>{children}</>;
}

