"use client";

import { Star } from "lucide-react";

interface SocialProofStripProps {
  variant?: "dark" | "light";
}

export function SocialProofStrip({ variant = "dark" }: SocialProofStripProps) {
  const isLight = variant === "light";

  return (
    <div className={variant === "dark" ? "mt-12 md:mt-16 pb-8 md:pb-12" : ""}>
      <div className="text-center">
        <div
          className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full ${
            isLight
              ? "bg-gray-100 border border-gray-200"
              : "bg-white/5 backdrop-blur-sm border border-white/10"
          }`}
        >
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4 sm:w-5 sm:h-5 fill-orange-400 text-orange-400 drop-shadow-sm"
              />
            ))}
          </div>
          <span
            className={`text-base sm:text-lg font-semibold ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            4.9/5
          </span>
          <div
            className={`hidden sm:block h-4 w-px ${
              isLight ? "bg-gray-300" : "bg-white/20"
            }`}
          />
          <p
            className={`text-xs sm:text-sm font-medium ${
              isLight ? "text-gray-700" : "text-white/80"
            }`}
          >
            Rated by product and customer success teams
          </p>
        </div>
      </div>
    </div>
  );
}
