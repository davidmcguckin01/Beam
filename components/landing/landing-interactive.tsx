"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Shared brand accent — kept in sync with app/page.tsx.
const ACCENT = "#FF5C35";

// ── RotatingWord ────────────────────────────────────────────────────────────
// The trailing word of the hero headline. Cycles through the AI tools we
// detect: the outgoing word slides up and out, the incoming one rises from
// below. An inline-grid stacks every word in one cell so the box is always
// sized to the widest word and the headline never reflows mid-rotation.

export function RotatingWord({
  words,
  intervalMs = 2200,
}: {
  words: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  const prevIndex = (index - 1 + words.length) % words.length;

  return (
    <span
      className="relative inline-grid overflow-hidden align-middle leading-[inherit]"
      style={{ color: ACCENT }}
    >
      {words.map((word, i) => {
        // "in"      → centred and visible
        // "out-up"  → the word that just left, sliding up and out
        // "below"   → waiting below the clip; no transition so the wrap-around
        //             from out-up back to below never animates through frame.
        const state =
          i === index ? "in" : i === prevIndex ? "out-up" : "below";
        return (
          <span
            key={word}
            aria-hidden={state !== "in"}
            className={`col-start-1 row-start-1 ${
              state === "below"
                ? "translate-y-full opacity-0"
                : "transition-all duration-500 ease-out"
            } ${
              state === "in"
                ? "translate-y-0 opacity-100"
                : state === "out-up"
                  ? "-translate-y-full opacity-0"
                  : ""
            }`}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── Reveal ──────────────────────────────────────────────────────────────────
// Fades + lifts its children into view the first time they enter the
// viewport. Used for the product screenshot and the benefit blocks.

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    // If the user prefers reduced motion, reveal on the next frame regardless
    // of scroll position — the transition won't be perceptible anyway.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => {
        cancelAnimationFrame(id);
        observer.disconnect();
      };
    }
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}

// ── FaqAccordion ────────────────────────────────────────────────────────────

export function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-black/8 overflow-hidden rounded-xl border border-black/10 bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-black/2 sm:px-6"
            >
              <span className="text-[14.5px] font-medium tracking-tight text-black sm:text-[15px]">
                {item.q}
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/10 text-black/50 transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M5.5 1.5 V9.5 M1.5 5.5 H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-black/60 sm:px-6">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
