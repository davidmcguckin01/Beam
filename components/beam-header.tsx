"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { setActiveOrgAction, createOrgAction } from "@/app/app/org-actions";
import {
  createSiteAction,
  deleteSiteAction,
  updateSiteDomainAction,
} from "@/app/app/actions";

type Org = { id: string; name: string; role: string };
type SiteSummary = { id: string; domain: string };

type Props = {
  orgs: Org[];
  activeOrg: Org;
  // All sites in the active org — for the site switcher dropdown.
  sites?: SiteSummary[];
  // When set, the site switcher shows this as the current selection. Null/
  // undefined on org-level pages (overview, settings).
  activeSite?: SiteSummary | null;
  current?: "overview" | "settings" | null;
};

export function BeamHeader({
  orgs,
  activeOrg,
  sites = [],
  activeSite = null,
  current = "overview",
}: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/8 bg-white/85 backdrop-blur">
      <div className="flex h-12 items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 font-semibold text-black"
            aria-label="Beam"
          >
            <Logo />
            <span>Beam</span>
          </Link>
          <Slash />
          <OrgSwitcher orgs={orgs} activeOrg={activeOrg} />
          {sites.length > 0 && (
            <>
              <Slash />
              <SiteSwitcher sites={sites} activeSite={activeSite} />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-0.5">
            <Tab href="/app" active={current === "overview"}>
              Overview
            </Tab>
            <Tab href="/app/settings" active={current === "settings"}>
              Settings
            </Tab>
          </nav>
          <div className="h-5 w-px bg-black/10" />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
                userButtonPopoverCard:
                  "border border-black/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]",
                userButtonPopoverActionButton: "text-[13px]",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${
        active ? "text-black" : "text-black/50 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}

function OrgSwitcher({ orgs, activeOrg }: { orgs: Org[]; activeOrg: Org }) {
  return (
    <Dropdown
      trigger={(open) => (
        <>
          <span className="truncate font-medium">{activeOrg.name}</span>
          <Chevron open={open} />
        </>
      )}
      triggerClassName="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-black hover:bg-black/5"
      menuClassName="w-64"
    >
      {(close) => (
        <>
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-black/40">
            Switch workspace
          </div>
          {orgs.map((o) => (
            <form key={o.id} action={setActiveOrgAction} className="block">
              <input type="hidden" name="orgId" value={o.id} />
              <button
                type="submit"
                onClick={() => close()}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-black/5 ${
                  o.id === activeOrg.id ? "text-black" : "text-black/70"
                }`}
              >
                <span className="truncate">{o.name}</span>
                {o.id === activeOrg.id && <Check />}
              </button>
            </form>
          ))}
          <div className="my-1 h-px bg-black/8" />
          <form action={createOrgAction} className="p-1">
            <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-black/40">
              Create workspace
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                name="name"
                required
                placeholder="Workspace name"
                className="block w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[13px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-7 items-center rounded-md bg-black px-2.5 text-[11px] font-medium text-white hover:bg-black/85"
              >
                Add
              </button>
            </div>
          </form>
        </>
      )}
    </Dropdown>
  );
}

function SiteSwitcher({
  sites,
  activeSite,
}: {
  sites: SiteSummary[];
  activeSite: SiteSummary | null;
}) {
  const label = activeSite ? activeSite.domain : "All sites";
  // Right-click context menu for editing/deleting a site. Holds the target
  // site, the cursor position to render at, and whether it's currently
  // showing the inline domain-edit form.
  const [menu, setMenu] = useState<{
    id: string;
    domain: string;
    x: number;
    y: number;
    editing: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <Dropdown
      trigger={(open) => (
        <>
          <span
            className={`truncate ${
              activeSite
                ? "font-mono text-[12.5px] text-black"
                : "text-black/70"
            }`}
          >
            {label}
          </span>
          <Chevron open={open} />
        </>
      )}
      triggerClassName="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/5"
      menuClassName="w-72"
    >
      {(close) => (
        <>
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-black/40">
            Switch site
          </div>
          {sites.length === 0 ? (
            <div className="px-2 py-2 text-[12.5px] text-black/45">
              No sites yet — add one below.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {sites.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/${s.id}`}
                    onClick={() => close()}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({
                        id: s.id,
                        domain: s.domain,
                        editing: false,
                        x: Math.min(e.clientX, window.innerWidth - 240),
                        y: Math.min(e.clientY, window.innerHeight - 170),
                      });
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-mono text-[12.5px] hover:bg-black/5 ${
                      activeSite?.id === s.id ? "text-black" : "text-black/70"
                    }`}
                  >
                    <span className="truncate">{s.domain}</span>
                    {activeSite?.id === s.id && <Check />}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {menu && (
            // Fixed-positioned context menu. The header's `backdrop-blur`
            // makes it a containing block for fixed descendants, but the
            // header sits flush in the viewport's top-left corner so
            // menu.x/menu.y (clientX/clientY) still land correctly.
            // Dismissal is handled by the document pointerdown/Escape
            // listeners above — a `fixed inset-0` backdrop would be clipped
            // to the header's height and never catch outside clicks.
            <div
              ref={menuRef}
              className="fixed z-40 min-w-[220px] rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]"
              style={{ top: menu.y, left: menu.x }}
            >
              {menu.editing ? (
                <form
                  action={updateSiteDomainAction}
                  onSubmit={() => {
                    setMenu(null);
                    close();
                  }}
                  className="p-1"
                >
                  <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-black/40">
                    Edit domain
                  </div>
                  <input type="hidden" name="siteId" value={menu.id} />
                  <div className="flex gap-1">
                    <input
                      type="text"
                      name="domain"
                      required
                      autoFocus
                      defaultValue={menu.domain}
                      placeholder="example.com"
                      autoComplete="off"
                      className="block w-full rounded-md border border-black/10 bg-white px-2 py-1.5 font-mono text-[12.5px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-7 items-center rounded-md bg-black px-2.5 text-[11px] font-medium text-white hover:bg-black/85"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="max-w-[220px] truncate px-2 pt-1 pb-0.5 font-mono text-[11px] text-black/45">
                    {menu.domain}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenu({ ...menu, editing: true })}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-black/80 hover:bg-black/5"
                  >
                    <Pencil />
                    Edit domain
                  </button>
                  <form
                    action={deleteSiteAction}
                    onSubmit={() => {
                      setMenu(null);
                      close();
                    }}
                  >
                    <input type="hidden" name="siteId" value={menu.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-red-600 hover:bg-red-50"
                    >
                      <Trash />
                      Delete site
                    </button>
                  </form>
                  <div className="px-2 pt-0.5 pb-1 text-[10.5px] text-black/35">
                    Removes all its events &amp; dashboards.
                  </div>
                </>
              )}
            </div>
          )}

          <div className="my-1 h-px bg-black/8" />
          <form action={createSiteAction} className="p-1">
            <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-black/40">
              Add a site
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                name="domain"
                required
                placeholder="example.com"
                autoComplete="off"
                className="block w-full rounded-md border border-black/10 bg-white px-2 py-1.5 font-mono text-[12.5px] text-black placeholder:text-black/30 focus:border-black/40 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-7 items-center rounded-md bg-black px-2.5 text-[11px] font-medium text-white hover:bg-black/85"
              >
                Add
              </button>
            </div>
          </form>
        </>
      )}
    </Dropdown>
  );
}

function Dropdown({
  trigger,
  triggerClassName,
  menuClassName,
  children,
}: {
  trigger: (open: boolean) => React.ReactNode;
  triggerClassName?: string;
  menuClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClassName}
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full z-20 mt-1 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)] ${
            menuClassName ?? ""
          }`}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.2 L12.8 12.8 L1.2 12.8 Z" fill="currentColor" />
    </svg>
  );
}

function Slash() {
  return <span className="text-black/20">/</span>;
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className={`text-black/40 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        d="M2.5 4 L5 6.5 L7.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className="text-black"
      aria-hidden
    >
      <path
        d="M2 5 L4.2 7 L8 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Trash() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      className="text-red-600"
      aria-hidden
    >
      <path
        d="M2.5 3.5 H9.5 M4.75 3.5 V2.5 H7.25 V3.5 M3.25 3.5 L3.75 10 H8.25 L8.75 3.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pencil() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      className="text-black/55"
      aria-hidden
    >
      <path
        d="M8 1.8 L10.2 4 M8.6 1.2 L10.8 3.4 L4.2 10 H2 V7.8 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
