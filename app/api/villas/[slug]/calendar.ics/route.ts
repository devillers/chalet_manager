// app/api/villas/[slug]/calendar.ics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { client } from "@/sanity/lib/client";
import { getBlockedRangesFromIcal } from "@/app/sites/lib/getBlockedRangesFromIcal";

const VILLA_DOC_TYPE = "villa" as const;

type ManualBlockedPeriod = { from?: string; to?: string; comment?: string | null };
type VillaCalendarData = {
  availabilityIcalUrl?: string | null;
  manualBlockedPeriods?: ManualBlockedPeriod[] | null;
};

async function getVillaCalendarDataBySlug(slug: string): Promise<VillaCalendarData | null> {
  const query = `
    *[_type == $docType && slug.current == $slug][0]{
      availabilityIcalUrl,
      "manualBlockedPeriods": coalesce(manualBlockedPeriods[]{ from, to, comment }, [])
    }
  `;

  const data = await client.fetch<VillaCalendarData | null>(
    query,
    { docType: VILLA_DOC_TYPE, slug },
    { cache: "no-store" },
  );

  return data;
}

function asDateValue(d: Date) {
  return format(d, "yyyyMMdd");
}

function asDtStampUtc(d: Date) {
  // 2025-01-01T12:34:56.789Z -> 20250101T123456Z
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(input: string) {
  return String(input || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } },
) {
  // ✅ Next 15: params peut être une Promise
  const { slug } = await Promise.resolve(context.params);

  if (!slug) {
    return new NextResponse("Missing slug", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const data = await getVillaCalendarDataBySlug(slug);
  if (!data) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const icalUrl = typeof data.availabilityIcalUrl === "string" ? data.availabilityIcalUrl.trim() : "";
  const icalRanges = icalUrl ? await getBlockedRangesFromIcal(icalUrl) : [];

  const dtstamp = asDtStampUtc(new Date());

  const manualPeriods = Array.isArray(data.manualBlockedPeriods) ? data.manualBlockedPeriods : [];

  type Entry = { source: "ical" | "manual"; from: Date; toInclusive: Date; summary: string };
  const entries: Entry[] = [];

  for (const r of icalRanges) {
    const from = startOfDay(new Date(r.from));
    const to = startOfDay(new Date(r.to));
    if (!isValid(from) || !isValid(to)) continue;
    entries.push({ source: "ical", from, toInclusive: to, summary: "Occupé" });
  }

  for (const p of manualPeriods) {
    const fromRaw = typeof p.from === "string" ? p.from : "";
    const toRaw = typeof p.to === "string" ? p.to : "";
    if (!fromRaw || !toRaw) continue;

    const from = startOfDay(parseISO(fromRaw));
    const to = startOfDay(parseISO(toRaw));
    if (!isValid(from) || !isValid(to)) continue;

    const summaryRaw = typeof p.comment === "string" ? p.comment.trim() : "";
    const summary = summaryRaw ? summaryRaw.slice(0, 120) : "Bloqué";
    entries.push({ source: "manual", from, toInclusive: to, summary });
  }

  entries.sort((a, b) => a.from.getTime() - b.from.getTime() || a.toInclusive.getTime() - b.toInclusive.getTime());

  // Dédupe simple (même source + mêmes dates)
  const deduped: Entry[] = [];
  for (const e of entries) {
    const prev = deduped.at(-1);
    if (prev && prev.source === e.source && prev.from.getTime() === e.from.getTime() && prev.toInclusive.getTime() === e.toInclusive.getTime()) {
      // garde l'info la plus riche côté manuel
      if (prev.summary === "Bloqué" && e.summary !== "Bloqué") prev.summary = e.summary;
      continue;
    }
    deduped.push(e);
  }

  const events = deduped
    .map((e) => {
      // iCal DTEND est exclusif → +1 jour
      const endExclusive = new Date(e.toInclusive);
      endExclusive.setDate(endExclusive.getDate() + 1);

      const uid = `${slug}-${e.source}-${asDateValue(e.from)}-${asDateValue(endExclusive)}@chalet-manager`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${asDateValue(e.from)}`,
        `DTEND;VALUE=DATE:${asDateValue(endExclusive)}`,
        `SUMMARY:${escapeIcsText(e.summary)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chalet Manager//Availability//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Disponibilités - ${slug}`,
    "X-WR-TIMEZONE:Europe/Paris",
    events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${slug}.ics"` }
        : {}),
    },
  });
}
