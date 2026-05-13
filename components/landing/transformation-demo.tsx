"use client";

import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export function TransformationDemo() {
  return (
    <div className="max-w-7xl mx-auto bg-zinc-50 rounded-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-3xl">
        <div className="bg-gray-50 p-6 sm:p-8 md:p-16 flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            TODO: Section headline
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed">
            TODO: Section subheadline.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-black hover:bg-gray-900 text-white font-semibold px-8 py-6 text-lg rounded-xl w-fit"
          >
            <Link href="/sign-up">TODO: CTA</Link>
          </Button>
        </div>

        <div className="relative overflow-hidden min-h-0 md:min-h-[500px] flex items-center justify-center p-6 sm:p-8 md:p-16">
          <Image
            src="/images/orange-gradient.webp"
            alt=""
            fill
            className="object-cover rounded-3xl"
            priority
          />

          <div className="relative bg-white rounded-2xl p-10 md:p-12 shadow-xl w-full max-w-lg z-20">
            <p className="text-gray-900 text-lg leading-relaxed mb-6">
              TODO: Sample copy.
            </p>

            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                <span className="text-2xl font-light leading-none">+</span>
                <span className="text-sm">Add styling</span>
              </div>
              <button className="flex items-center justify-center w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors shadow-md">
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
