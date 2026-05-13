"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const completedTasks = [
  {
    title: "Never ask 'what did they mean?' again",
    subtitle: "Full context captured automatically",
  },
  {
    title: "Focus on what actually matters",
    subtitle: "Customer impact drives priority",
  },
  {
    title: "No more translating feedback into tasks",
    subtitle: "Clear, actionable descriptions ready to ship",
  },
  {
    title: "Stop wondering who should handle this",
    subtitle: "Smart owner suggestions based on context",
  },
];

export function BackendDone() {
  return (
    <div className="max-w-7xl mx-auto bg-zinc-50 rounded-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-3xl">
        {/* Left Side - Black Gradient Background */}
        <div className="relative overflow-hidden min-h-0 md:min-h-[500px] flex items-end pt-6 sm:pt-8 md:pt-16 px-6 sm:px-8 md:px-16">
          {/* Black Gradient Background Image */}
          <Image
            src="/images/black-gradient.webp"
            alt=""
            fill
            className="object-cover rounded-3xl"
            priority
          />
          <div className="relative bg-white rounded-t-2xl p-10 md:p-12 shadow-xl w-full max-w-lg z-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                <div className="w-6 h-6 bg-orange-600 rounded"></div>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Building your Feedback Tasks
              </h3>
            </div>

            <div className="space-y-7">
              {completedTasks.map((task, index) => (
                <div key={index} className="flex items-start gap-5">
                  <div className="shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold text-xl mb-1.5">
                      {task.title}
                    </p>
                    <p className="text-gray-500 text-base">{task.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Light Gray Background */}
        <div className="bg-gray-50 p-6 sm:p-8 md:p-16 flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            The grunt work? We handle it.
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed">
            Context extraction, prioritization, task generation, owner
            assignment - all handled automatically, no extra setup needed.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-black hover:bg-gray-900 text-white font-semibold px-8 py-6 text-lg rounded-xl w-fit"
          >
            <Link href="/sign-up">Stop the chaos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
