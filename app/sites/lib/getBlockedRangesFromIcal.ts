// app/sites/lib/getBlockedRangesFromIcal.ts
import * as ical from "node-ical";
import { addDays, startOfDay, isAfter } from "date-fns";

export type BlockedRange = { from: string; to: string };

export async function getBlockedRangesFromIcal(
  icalUrl: string,
): Promise<BlockedRange[]> {
  try {
    const res = await fetch(icalUrl, { next: { revalidate: 300 } });
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
    return out;
  } catch {
    return [];
  }
}
