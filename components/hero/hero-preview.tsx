"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function HeroPreview() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 md:mt-16">
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
        {/* Messy Feedback Card */}
        <Card className="w-full md:w-[280px] bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Messy feedback
              </div>
              <p className="text-sm text-gray-100 leading-relaxed">
                "The dashboard feels cluttered and confusing. Can you make it pop more and highlight the important data?"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Arrow Indicator */}
        <div className="hidden md:flex items-center justify-center text-white/60">
          <ArrowRight className="w-8 h-8" />
        </div>
        <div className="md:hidden flex items-center justify-center text-white/60 py-2">
          <ArrowRight className="w-6 h-6 rotate-90" />
        </div>

        {/* Generated Task Card */}
        <Card className="w-full md:w-[320px] bg-white/95 backdrop-blur-md border-white/30 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-3xl animate-float">
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Generated task
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Improve dashboard readability
              </h3>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Increase headline contrast</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Add spacing around key metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Simplify secondary widgets</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


