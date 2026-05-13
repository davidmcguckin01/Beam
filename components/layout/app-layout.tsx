"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceSelector } from "@/components/workspace-selector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    const n = pathname.replace(/\/$/, "");
    if (path === "/dashboard") {
      return (
        n === "/dashboard" ||
        n === "/dashboard/feedback-pages" ||
        n.startsWith("/dashboard/feedback-pages/")
      );
    }
    if (path === "/dashboard/customers") {
      return n === "/dashboard/customers" || n.startsWith("/dashboard/customers/");
    }
    if (path === "/dashboard/settings") {
      return n === "/dashboard/settings" || n.startsWith("/dashboard/settings/");
    }
    return n === path;
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/customers", label: "Contacts" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 h-[52px] bg-gray-50 border-b border-gray-200/90 px-3 sm:px-5 z-30">
        <div className="flex items-center justify-between h-full">
          {/* Left: Logo + WorkspaceSelector */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/">
              <Image
                src="/logos/android-chrome-512x512.png"
                alt="App"
                width={1000}
                height={1000}
                className="rounded-full h-6 w-6"
              />
            </Link>
            {isSignedIn && (
              <div
                className="ml-1 h-4 w-px bg-gray-400/70 hidden sm:block"
                style={{ transform: "rotate(16deg)", transformOrigin: "center" }}
              />
            )}
            {isSignedIn && <WorkspaceSelector />}
          </div>

          {/* Center: Nav tabs (hidden on mobile) */}
          {isSignedIn && (
            <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/60"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right: Mobile menu toggle + Settings + UserButton */}
          <div className="flex items-center gap-2">
            {isSignedIn && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 md:hidden"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
            {isSignedIn && (
              <Link
                href="/dashboard/settings"
                className={cn(
                  "p-1.5 rounded-md transition-colors hidden sm:flex",
                  isActive("/dashboard/settings")
                    ? "text-gray-900 bg-white shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/60"
                )}
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
            {isSignedIn ? (
              <UserButton />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {isSignedIn && mobileMenuOpen && (
        <div className="fixed top-[52px] left-0 right-0 bg-white border-b border-gray-200 z-30 md:hidden">
          <nav className="flex flex-col px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-3 text-sm font-medium rounded-md transition-colors",
                  isActive(item.href)
                    ? "bg-gray-50 text-gray-900"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "px-3 py-3 text-sm font-medium rounded-md transition-colors sm:hidden",
                isActive("/dashboard/settings")
                  ? "bg-gray-50 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              Settings
            </Link>
          </nav>
        </div>
      )}

      <main className="min-h-screen pt-[52px] bg-white">
        {children}
      </main>
    </div>
  );
}
