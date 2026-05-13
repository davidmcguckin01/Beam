// Single ingest endpoint with three modes:
//
//   1. JS pixel (GET or POST querystring) — human referrals.
//      Drops if UA matches bot patterns; drops if no external referrer.
//
//   2. <noscript><img> beacon (GET ?c=1) — crawler fallback.
//      Returns 1x1 GIF; page URL comes from Referer header.
//      Best-effort; only catches bots that render HTML.
//
//   3. Server-side event (POST application/json) — high-fidelity crawler hits.
//      Customer's middleware/worker sees every request, posts when UA matches
//      our bots regex. We enrich (category, vendor, verify IP) and store.

import { NextRequest } from "next/server";
import { db } from "@/db";
import { site, event } from "@/db/schema";
import { eq } from "drizzle-orm";
import { detectSource, extractHost } from "@/lib/sources";
import { detectBot, isJsPixelBot } from "@/lib/bots";
import { verifyBotIp } from "@/lib/bot-verify";

const PIXEL_OK_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

const JSON_OK_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

// 43-byte transparent 1x1 GIF.
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);
const GIF_HEADERS = {
  "content-type": "image/gif",
  "access-control-allow-origin": "*",
  "cache-control": "no-store, no-cache, must-revalidate",
};

function gifResponse() {
  return new Response(TRANSPARENT_GIF, { status: 200, headers: GIF_HEADERS });
}
function okResponse() {
  return new Response("ok", { status: 200, headers: PIXEL_OK_HEADERS });
}
function jsonOk(payload: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: JSON_OK_HEADERS,
  });
}

async function lookupSite(apiKey: string | null | undefined) {
  if (!apiKey) return null;
  const rows = await db
    .select()
    .from(site)
    .where(eq(site.apiKey, apiKey))
    .limit(1);
  return rows[0] ?? null;
}

// ----- Mode 1 + 2: pixel / noscript ----------------------------------------

async function handlePixel(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get("s");
  const isCrawlerBeacon = searchParams.get("c") === "1";
  const respond = isCrawlerBeacon ? gifResponse : okResponse;

  if (!apiKey) return respond();

  const ua = req.headers.get("user-agent");
  const country = req.headers.get("x-vercel-ip-country");

  const matched = await lookupSite(apiKey);
  if (!matched) return respond();

  if (isCrawlerBeacon) {
    const bot = detectBot(ua);
    const pageUrl = req.headers.get("referer") || "";
    await db.insert(event).values({
      siteId: matched.id,
      url: pageUrl,
      referrer: null,
      referrerHost: null,
      source: bot?.name ?? "Other crawler",
      country,
      kind: "crawler",
      botVendor: bot?.vendor ?? null,
      botCategory: bot?.category ?? "unknown",
      verified: false, // noscript img comes without IP we can trust
      userAgent: ua,
    });
    return respond();
  }

  // JS pixel — human path
  if (isJsPixelBot(ua)) return respond();

  const url = searchParams.get("u") || "";
  const referrer = searchParams.get("r") || null;
  const referrerHost = extractHost(referrer);
  if (!referrerHost) return respond();
  const ownHost = extractHost(url);
  if (ownHost && referrerHost === ownHost) return respond();

  await db.insert(event).values({
    siteId: matched.id,
    url,
    referrer,
    referrerHost,
    source: detectSource(referrer),
    country,
    kind: "human",
  });

  return respond();
}

// ----- Mode 3: server-side event (POST application/json) -------------------

type ServerEventPayload = {
  s?: string;
  ua?: string;
  url?: string;
  ip?: string;
  country?: string;
  asn?: string | number;
};

async function handleServerEvent(req: NextRequest) {
  let body: ServerEventPayload;
  try {
    body = (await req.json()) as ServerEventPayload;
  } catch {
    return jsonOk({ ok: false, error: "invalid_json" });
  }

  const matched = await lookupSite(body.s);
  if (!matched) return jsonOk(); // silent OK — don't leak which keys exist

  const ua = body.ua || "";
  const bot = detectBot(ua);
  // No bot match → drop. Customer middleware should pre-filter but be defensive.
  if (!bot) return jsonOk();

  const ip = body.ip || null;
  const verified = await verifyBotIp(bot, ip);

  await db.insert(event).values({
    siteId: matched.id,
    url: body.url || "",
    referrer: null,
    referrerHost: null,
    source: bot.name,
    country: body.country || null,
    kind: "crawler",
    botVendor: bot.vendor,
    botCategory: bot.category,
    verified,
    asn: body.asn != null ? String(body.asn) : null,
    userAgent: ua,
  });

  return jsonOk({ ok: true, verified });
}

// ----- Dispatch ------------------------------------------------------------

export async function GET(req: NextRequest) {
  return handlePixel(req);
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return handleServerEvent(req);
  return handlePixel(req);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
