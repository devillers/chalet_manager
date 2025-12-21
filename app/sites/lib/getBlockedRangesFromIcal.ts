// app/sites/lib/getBlockedRangesFromIcal.ts
import ical from "node-ical";
import { addDays, startOfDay, isAfter } from "date-fns";

export type BlockedRange = { from: string; to: string };

function normalizeIcalUrl(input: string): string {
  const url = String(input || "").trim();
  if (!url) return "";
  // Certains providers donnent des URLs "webcal://" (schéma iCal). On convertit en https.
  return url.replace(/^webcals?:\/\//i, "https://");
}

export async function getBlockedRangesFromIcal(
  icalUrl: string,
): Promise<BlockedRange[]> {
  try {
    const url = normalizeIcalUrl(icalUrl);
    if (!url) return [];

    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { Accept: "text/calendar,*/*" },
    });
    if (!res.ok) return [];

    const ics = await res.text();
    const parsed = ical.parseICS(ics);

    const out: BlockedRange[] = [];

    for (const key of Object.keys(parsed)) {
      const ev: any = (parsed as any)[key];
      if (!ev || ev.type !== "VEVENT" || !ev.start || !ev.end) continue;

      const from = startOfDay(new Date(ev.start));
      const endExclusive = startOfDay(new Date(ev.end));
      const toInclusive = addDays(endExclusive, -1);
      const to = isAfter(from, toInclusive) ? from : toInclusive;

      out.push({ from: from.toISOString(), to: to.toISOString() });
    }

    out.sort((a, b) => a.from.localeCompare(b.from));
    // Évite les doublons (UID stable côté export .ics)
    const deduped: BlockedRange[] = [];
    for (const range of out) {
      const prev = deduped.at(-1);
      if (prev && prev.from === range.from && prev.to === range.to) continue;
      deduped.push(range);
    }
    return deduped;
  } catch {
    return [];
  }
}
