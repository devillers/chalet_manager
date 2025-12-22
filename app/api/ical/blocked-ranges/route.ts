// app/api/ical/blocked-ranges/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getBlockedRangesFromIcal } from "@/app/sites/lib/getBlockedRangesFromIcal";

function normalizeIncomingUrl(input: string) {
  return String(input || "").trim().replace(/^webcals?:\/\//i, "https://");
}

function isAllowedIcalHost(hostname: string) {
  const raw = process.env.ICAL_ALLOWED_HOSTS ?? "calendar.avantio.pro";
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes("*")) return true;
  return allowed.includes(hostname.toLowerCase());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const input = url.searchParams.get("url") || "";
  const normalized = normalizeIncomingUrl(input);

  if (!normalized) {
    return NextResponse.json({ error: "Missing url" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!isAllowedIcalHost(parsed.hostname)) {
    return NextResponse.json(
      { error: "Host not allowed" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const ranges = await getBlockedRangesFromIcal(parsed.toString());
  return NextResponse.json({ ranges }, { headers: { "Cache-Control": "no-store" } });
}

