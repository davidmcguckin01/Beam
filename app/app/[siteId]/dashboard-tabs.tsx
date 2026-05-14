"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createDashboardAction,
  deleteDashboardAction,
  renameDashboardAction,
  reorderDashboardsAction,
} from "@/app/app/actions";

type Dashboard = { id: string; name: string; position: number };

export function DashboardTabs({
  siteId,
  dashboards,
  activeId,
}: {
  siteId: string;
  dashboards: Dashboard[];
  activeId: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Track ordering locally so the user can drag tabs without a server round-
  // trip per swap. Persist when drag ends.
  const [order, setOrder] = useState<string[]>(dashboards.map((d) => d.id));
  useEffect(() => {
    setOrder(dashboards.map((d) => d.id));
  }, [dashboards]);

  const byId = new Map(dashboards.map((d) => [d.id, d]));
  const orderedTabs = order
    .map((id) => byId.get(id))
    .filter((d): d is Dashboard => !!d);

  const dragId = useRef<string | null>(null);

  const onDragStart = (id: string) => () => {
    dragId.current = id;
  };
  const onDragOver = (overId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = dragId.current;
    if (!fromId || fromId === overId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== fromId);
      const idx = next.indexOf(overId);
      next.splice(idx, 0, fromId);
      return next;
    });
  };
  const onDragEnd = () => {
    dragId.current = null;
    // Persist if order changed.
    const original = dashboards.map((d) => d.id).join(",");
    const current = order.join(",");
    if (original === current) return;
    const fd = new FormData();
    fd.append("siteId", siteId);
    fd.append("order", JSON.stringify(order));
    startTransition(() => reorderDashboardsAction(fd));
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-black/8">
      {orderedTabs.map((d) => (
        <Tab
          key={d.id}
          dashboard={d}
          active={d.id === activeId}
          siteId={siteId}
          renaming={renaming === d.id}
          onStartRename={() => setRenaming(d.id)}
          onCancelRename={() => setRenaming(null)}
          onDragStart={onDragStart(d.id)}
          onDragOver={onDragOver(d.id)}
          onDragEnd={onDragEnd}
          canDelete={dashboards.length > 1}
        />
      ))}
      <NewDashboardButton siteId={siteId} />
      {pending && (
        <span className="ml-2 font-mono text-[11px] text-black/40">
          Saving…
        </span>
      )}
      {/* `router` is captured for consistency though not used directly — keeps
          this hook stable for future use (e.g., optimistic switch). */}
      <span aria-hidden hidden>
        {router ? "" : ""}
      </span>
    </div>
  );
}

function Tab({
  dashboard,
  active,
  siteId,
  renaming,
  onStartRename,
  onCancelRename,
  onDragStart,
  onDragOver,
  onDragEnd,
  canDelete,
}: {
  dashboard: Dashboard;
  active: boolean;
  siteId: string;
  renaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  if (renaming) {
    return (
      <form
        action={renameDashboardAction}
        onSubmit={() => onCancelRename()}
        className="inline-flex items-center gap-1 px-2 py-1.5"
      >
        <input type="hidden" name="dashboardId" value={dashboard.id} />
        <input
          name="name"
          defaultValue={dashboard.name}
          autoFocus
          onBlur={(e) => {
            // Submit if changed; cancel otherwise.
            if (e.currentTarget.value.trim() !== dashboard.name) {
              e.currentTarget.form?.requestSubmit();
            } else {
              onCancelRename();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancelRename();
            }
          }}
          maxLength={60}
          className="w-32 rounded border border-black/15 bg-white px-2 py-0.5 text-[12.5px] text-black focus:border-black/40 focus:outline-none"
        />
      </form>
    );
  }

  return (
    <div
      className={`relative -mb-px inline-flex items-stretch border-b-2 transition-colors ${
        active
          ? "border-black"
          : "border-transparent hover:border-black/15"
      }`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <Link
        href={`/app/${siteId}?d=${dashboard.id}`}
        className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] ${
          active ? "text-black" : "text-black/55 hover:text-black"
        }`}
        onDoubleClick={(e) => {
          e.preventDefault();
          onStartRename();
        }}
      >
        {dashboard.name}
      </Link>
      <div ref={menuRef} className="relative flex items-center">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded text-black/35 hover:bg-black/5 hover:text-black"
          aria-label="Tab menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <svg width="3" height="11" viewBox="0 0 3 11" aria-hidden>
            <circle cx="1.5" cy="1.5" r="1.2" fill="currentColor" />
            <circle cx="1.5" cy="5.5" r="1.2" fill="currentColor" />
            <circle cx="1.5" cy="9.5" r="1.2" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]"
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStartRename();
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-black/80 hover:bg-black/5 hover:text-black"
            >
              Rename
            </button>
            <form action={deleteDashboardAction}>
              <input type="hidden" name="dashboardId" value={dashboard.id} />
              <button
                type="submit"
                disabled={!canDelete}
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-black/30 disabled:hover:bg-transparent"
                title={
                  canDelete
                    ? "Delete this dashboard"
                    : "Can't delete the last dashboard"
                }
              >
                Delete
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function NewDashboardButton({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div ref={ref} className="relative -mb-px inline-flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] text-black/45 hover:bg-black/5 hover:text-black"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-[14px] leading-none">+</span>
        <span>New dashboard</span>
      </button>
      {open && (
        <form
          action={createDashboardAction}
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-black/10 bg-white p-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]"
        >
          <input type="hidden" name="siteId" value={siteId} />
          <div className="px-1 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-black/45">
            New dashboard
          </div>
          <div className="flex gap-1">
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Crawler focus"
              maxLength={60}
              className="block w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12.5px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-7 items-center rounded-md bg-black px-2.5 text-[11px] font-medium text-white hover:bg-black/85"
            >
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
