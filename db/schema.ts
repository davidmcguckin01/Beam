import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Ocholens: AI traffic analytics
// ---------------------------------------------------------------------------

// Ocholens users are mirrored from Clerk by clerk_user_id. We keep our own row so
// foreign keys, membership joins, and offline jobs don't have to call Clerk.
export const beamUser = pgTable("beam_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beamOrg = pgTable("beam_org", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// role: "owner" | "admin" | "member"
export const beamMembership = pgTable(
  "beam_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => beamUser.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => beamOrg.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userOrgIdx: index("beam_membership_user_org_idx").on(
      table.userId,
      table.orgId,
    ),
    orgIdx: index("beam_membership_org_idx").on(table.orgId),
  }),
);

export const beamInvite = pgTable(
  "beam_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => beamOrg.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => beamUser.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("beam_invite_org_idx").on(table.orgId),
    emailIdx: index("beam_invite_email_idx").on(table.email),
  }),
);

export const site = pgTable("site", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => beamOrg.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  apiKey: text("api_key").notNull().unique(),
  // Detected platform: 'nextjs' | 'shopify' | 'wordpress' | 'webflow' |
  // 'framer' | 'wix' | 'squarespace' | 'ghost' | 'cloudflare-pages' |
  // 'vercel' | 'unknown' | null (not yet checked).
  stack: text("stack"),
  stackDetectedAt: timestamp("stack_detected_at"),
  // Dashboard widget layout (per-site, everyone in the org sees the same).
  // Stored as either a legacy `string[]` of widget keys or the structured
  // grid layout `{i,x,y,w,h}[]` used by react-grid-layout. resolveLayout in
  // lib/dashboard-widgets.ts handles both shapes. Null = use the default.
  dashboardLayout: jsonb("dashboard_layout").$type<unknown>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-site dashboard tabs. Each site has 1+ dashboards; each carries its
// own widget layout. The site.dashboard_layout column is kept for legacy
// reasons but is no longer the source of truth — resolveLayout migrates
// stored values transparently on first read.
export const dashboard = pgTable(
  "dashboard",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Display order within the site (0-indexed). Lower = leftmost tab.
    position: integer("position").notNull().default(0),
    // {i,x,y,w,h}[] — see lib/dashboard-widgets.ts.
    layout: jsonb("layout").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    siteIdPositionIdx: index("dashboard_site_id_position_idx").on(
      table.siteId,
      table.position,
    ),
  }),
);

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    ts: timestamp("ts").defaultNow().notNull(),
    url: text("url").notNull(),
    referrer: text("referrer"),
    // Lowercased hostname of the referrer (no www.), used for grouping non-AI
    // traffic in the dashboard. Null for direct visits / unparseable referrers.
    referrerHost: text("referrer_host"),
    // For humans: AI source name (ChatGPT, Claude, ...) or null.
    // For crawlers: extracted crawler family name (Googlebot, GPTBot, ...).
    source: text("source"),
    country: text("country"),
    // 'human' (default) for JS-pixel hits. 'crawler' for no-JS <img> beacon
    // requests from bots that don't run scripts AND server-side detected hits.
    kind: text("kind").notNull().default("human"),
    // Bot taxonomy. Populated for crawler rows; null for humans.
    // Vendor: 'openai' | 'anthropic' | 'google' | 'meta' | 'perplexity' | ...
    botVendor: text("bot_vendor"),
    // Category: 'training' | 'search' | 'user' | 'unknown'
    botCategory: text("bot_category"),
    // True if we cryptographically tied the request IP to the vendor's
    // published IP ranges. False = matched UA only, could be spoofed.
    verified: boolean("verified").notNull().default(false),
    asn: text("asn"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    siteIdTsIdx: index("event_site_id_ts_idx").on(table.siteId, table.ts),
    referrerHostIdx: index("event_site_referrer_host_idx").on(
      table.siteId,
      table.referrerHost,
    ),
    // Composite (siteId, kind, ts) — serves the dashboard's per-kind,
    // 30-day-window aggregations (crawler/AI breakdowns) in a single index
    // range scan instead of a bitmap-AND of two narrower indexes, and still
    // covers plain (siteId, kind) lookups as a prefix. Supersedes the old
    // event_site_kind_idx.
    siteIdKindTsIdx: index("event_site_kind_ts_idx").on(
      table.siteId,
      table.kind,
      table.ts,
    ),
    siteIdCategoryIdx: index("event_site_category_idx").on(
      table.siteId,
      table.botCategory,
    ),
  }),
);

export type OcholensUser = typeof beamUser.$inferSelect;
export type NewOcholensUser = typeof beamUser.$inferInsert;
export type OcholensOrg = typeof beamOrg.$inferSelect;
export type NewOcholensOrg = typeof beamOrg.$inferInsert;
export type OcholensMembership = typeof beamMembership.$inferSelect;
export type NewOcholensMembership = typeof beamMembership.$inferInsert;
export type OcholensInvite = typeof beamInvite.$inferSelect;
export type NewOcholensInvite = typeof beamInvite.$inferInsert;
export type Site = typeof site.$inferSelect;
export type NewSite = typeof site.$inferInsert;
export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;
