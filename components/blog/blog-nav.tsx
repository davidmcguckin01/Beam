"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function BlogNav() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-6 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-full">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logos/android-chrome-512x512.png"
            alt="App"
            width={32}
            height={32}
            className="rounded-full"
          />
          <h1 className="text-lg font-semibold text-gray-900">App</h1>
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-black hover:bg-gray-900 text-white"
          >
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

