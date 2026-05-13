"use client";

import { Languages, Image as ImageIcon, TrendingUp, Zap } from "lucide-react";

const features = [
  {
    icon: Languages,
    text: "AI feedback translation",
    color: "text-blue-300",
  },
  {
    icon: ImageIcon,
    text: "Screenshot → text (OCR)",
    color: "text-purple-300",
  },
  {
    icon: TrendingUp,
    text: "Customer value-aware prioritization",
    color: "text-green-300",
  },
  {
    icon: Zap,
    text: "Auto-generated tasks for product & CS",
    color: "text-orange-300",
  },
];

export function FeatureRow() {
  return (
    <div className="mt-8 md:mt-10">
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <div className={`${feature.color} transition-transform duration-200 group-hover:scale-110`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-white/80 group-hover:text-white transition-colors duration-200 whitespace-nowrap">
                {feature.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

