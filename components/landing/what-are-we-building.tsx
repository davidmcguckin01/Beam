"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function WhatAreWeBuilding() {
  return (
    <section className="relative py-20 md:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient: blue-gray at top, orange-peach at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(200, 210, 230, 0.5) 0%, rgba(220, 200, 220, 0.3) 40%, rgba(255, 200, 180, 0.4) 100%)",
          }}
        />
        {/* Radial gradient for soft center glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 100% at 50% 70%, rgba(255, 180, 150, 0.3) 0%, transparent 60%)",
          }}
        />
        {/* Subtle blur effect overlay */}
        <div
          className="absolute inset-0 backdrop-blur-[1px]"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black mb-8 md:mb-12 leading-tight">
          Ready to stop drowning in feedback?
        </h2>
        <Button
          asChild
          size="lg"
          className="bg-lime-400 hover:bg-lime-500 text-black font-semibold px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          <Link href="/sign-up">Stop the chaos</Link>
        </Button>
      </div>
    </section>
  );
}
