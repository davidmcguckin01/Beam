import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { setActiveOrgAction, createOrgAction } from "@/app/app/org-actions";
import { createSiteAction } from "@/app/app/actions";

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
          <Slash />
          <SiteSwitcher sites={sites} activeSite={activeSite} />
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
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-0.5 text-black hover:bg-black/5 [&::-webkit-details-marker]:hidden">
        <span className="truncate font-medium">{activeOrg.name}</span>
        <Chevron />
      </summary>
      <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
        <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-black/40">
          Switch workspace
        </div>
        {orgs.map((o) => (
          <form key={o.id} action={setActiveOrgAction} className="block">
            <input type="hidden" name="orgId" value={o.id} />
            <button
              type="submit"
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
      </div>
    </details>
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

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/5 [&::-webkit-details-marker]:hidden">
        <span
          className={`truncate ${
            activeSite
              ? "font-mono text-[12.5px] text-black"
              : "text-black/70"
          }`}
        >
          {label}
        </span>
        <Chevron />
      </summary>
      <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-black/10 bg-white p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
        <div className="flex items-baseline justify-between px-2 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-black/40">
            Switch site
          </span>
          <Link
            href="/app"
            className="font-mono text-[10px] uppercase tracking-wide text-black/40 hover:text-black"
          >
            view all
          </Link>
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
      </div>
    </details>
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

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className="text-black/40"
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
