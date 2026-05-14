"use client";

import { useState, useTransition } from "react";
import { saveDashboardLayoutAction } from "@/app/app/actions";
import {
  WIDGETS,
  type WidgetKey,
} from "@/lib/dashboard-widgets";

export function CustomiseSheet({
  siteId,
  layout,
}: {
  siteId: string;
  layout: WidgetKey[];
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<WidgetKey[]>(layout);
  const [visible, setVisible] = useState<Set<WidgetKey>>(new Set(layout));
  const [pending, startTransition] = useTransition();

  // Widgets the user has hidden, listed after the visible ones in the
  // canonical registry order. This lets a user re-enable something without
  // hunting for it.
  const hidden = WIDGETS.filter((w) => !visible.has(w.key)).map((w) => w.key);

  const toggle = (k: WidgetKey) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
      } else {
        next.add(k);
        if (!order.includes(k)) setOrder((o) => [...o, k]);
      }
      return next;
    });
  };

  const move = (k: WidgetKey, delta: -1 | 1) => {
    setOrder((prev) => {
      const visibleOrder = prev.filter((x) => visible.has(x));
      const idx = visibleOrder.indexOf(k);
      const swap = idx + delta;
      if (idx < 0 || swap < 0 || swap >= visibleOrder.length) return prev;
      const next = [...visibleOrder];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      // Re-merge hidden keys at end so they're preserved if toggled on later.
      const stillHidden = prev.filter((x) => !visible.has(x));
      return [...next, ...stillHidden];
    });
  };

  const reset = () => {
    setOrder(layout);
    setVisible(new Set(layout));
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-black/70 hover:bg-black/3 hover:text-black"
      >
        Customise
      </button>
    );
  }

  const visibleOrdered = order.filter((k) => visible.has(k));
  const meta = (k: WidgetKey) => WIDGETS.find((w) => w.key === k)!;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-30 bg-black/30"
        onClick={close}
      />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-sm flex-col bg-white shadow-[0_0_40px_-8px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
          <div>
            <h2 className="text-[14px] font-medium text-black">
              Customise dashboard
            </h2>
            <p className="mt-0.5 text-[12px] text-black/55">
              Toggle widgets and reorder them.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-black/45 hover:bg-black/5 hover:text-black"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M3 3 L11 11 M11 3 L3 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Group title="Visible">
            {visibleOrdered.length === 0 ? (
              <div className="rounded-md border border-dashed border-black/10 px-3 py-4 text-[12.5px] text-black/45">
                Nothing visible. Toggle a widget on below.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {visibleOrdered.map((k, i) => (
                  <Row
                    key={k}
                    meta={meta(k)}
                    visible
                    onToggle={() => toggle(k)}
                    onUp={i > 0 ? () => move(k, -1) : undefined}
                    onDown={
                      i < visibleOrdered.length - 1
                        ? () => move(k, 1)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </Group>

          {hidden.length > 0 && (
            <Group title="Hidden">
              <ul className="space-y-1.5">
                {hidden.map((k) => (
                  <Row
                    key={k}
                    meta={meta(k)}
                    visible={false}
                    onToggle={() => toggle(k)}
                  />
                ))}
              </ul>
            </Group>
          )}
        </div>

        <form
          action={(fd) => startTransition(() => saveDashboardLayoutAction(fd))}
          className="flex items-center justify-between gap-2 border-t border-black/8 px-5 py-3"
        >
          <input type="hidden" name="siteId" value={siteId} />
          <input
            type="hidden"
            name="layout"
            value={JSON.stringify(visibleOrdered)}
          />
          <button
            type="button"
            onClick={reset}
            className="text-[12px] text-black/55 hover:text-black"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-[12.5px] text-black/70 hover:bg-black/3 hover:text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-black px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-black/85 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-black/45">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  meta,
  visible,
  onToggle,
  onUp,
  onDown,
}: {
  meta: { key: string; label: string; description: string };
  visible: boolean;
  onToggle: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-md border border-black/8 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          visible ? "bg-black" : "bg-black/15"
        }`}
        aria-pressed={visible}
        aria-label={visible ? "Hide" : "Show"}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition-transform ${
            visible ? "translate-x-[14px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-black">{meta.label}</div>
        <div className="mt-0.5 text-[11.5px] text-black/55">
          {meta.description}
        </div>
      </div>
      {visible && (onUp || onDown) && (
        <div className="flex flex-col gap-0.5">
          <ArrowButton dir="up" onClick={onUp} />
          <ArrowButton dir="down" onClick={onDown} />
        </div>
      )}
    </li>
  );
}

function ArrowButton({
  dir,
  onClick,
}: {
  dir: "up" | "down";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded p-0.5 text-black/45 hover:bg-black/5 hover:text-black disabled:opacity-30 disabled:hover:bg-transparent"
      aria-label={dir === "up" ? "Move up" : "Move down"}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path
          d={dir === "up" ? "M2 6 L5 3 L8 6" : "M2 4 L5 7 L8 4"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </button>
  );
}
