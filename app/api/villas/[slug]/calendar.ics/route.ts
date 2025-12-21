// app/api/villas/[slug]/calendar.ics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { format } from "date-fns";
import { client } from "@/sanity/lib/client";
import { getBlockedRangesFromIcal } from "@/app/sites/lib/getBlockedRangesFromIcal";

const VILLA_DOC_TYPE = "villa" as const;

async function getVillaIcalUrlBySlug(slug: string): Promise<string | null> {
  const query = `
    *[_type == $docType && slug.current == $slug][0]{
      availabilityIcalUrl
    }
  `;

  const data = await client.fetch<{ availabilityIcalUrl?: string | null }>(
    query,
    { docType: VILLA_DOC_TYPE, slug },
    { cache: "no-store" },
  );

  return data?.availabilityIcalUrl ?? null;
}

function asDateValue(d: Date) {
  return format(d, "yyyyMMdd");
}

function asDtStampUtc(d: Date) {
  // 2025-01-01T12:34:56.789Z -> 20250101T123456Z
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
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

  const icalUrl = await getVillaIcalUrlBySlug(slug);
  if (!icalUrl) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const ranges = await getBlockedRangesFromIcal(icalUrl);

  const dtstamp = asDtStampUtc(new Date());

  const events = ranges
    .map((r) => {
      const start = new Date(r.from);
      const endInclusive = new Date(r.to);

      // iCal DTEND est exclusif → +1 jour
      const endExclusive = new Date(endInclusive);
      endExclusive.setDate(endExclusive.getDate() + 1);

      const uid = `${slug}-${asDateValue(start)}-${asDateValue(endExclusive)}@chalet-manager`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${asDateValue(start)}`,
        `DTEND;VALUE=DATE:${asDateValue(endExclusive)}`,
        "SUMMARY:Indisponible",
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
