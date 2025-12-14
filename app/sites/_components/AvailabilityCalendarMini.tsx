// app/sites/_components/AvailabilityCalendarMini.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "date-fns/locale";
import { parseISO, startOfDay } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";

export function AvailabilityCalendarMini({
  blockedRanges,
  subscribePath,
  downloadPath,
  defaultOpen = false,
}: {
  blockedRanges: BlockedRange[];
  subscribePath: string;
  downloadPath: string;
  defaultOpen?: boolean;
}) {
  const disabled = useMemo(() => {
    const safe = Array.isArray(blockedRanges) ? blockedRanges : [];
    return safe
      .filter((r) => r?.from && r?.to)
      .map((r) => ({
        from: startOfDay(parseISO(r.from)),
        to: startOfDay(parseISO(r.to)),
      }));
  }, [blockedRanges]);

  const hasSync = disabled.length > 0;

  // Hydration-safe
  const [webcalHref, setWebcalHref] = useState<string>(subscribePath);

  useEffect(() => {
    if (!subscribePath) return;

    try {
      const url = new URL(subscribePath, window.location.origin);
      setWebcalHref(url.toString().replace(/^https?:\/\//, "webcal://"));
    } catch {
      setWebcalHref(subscribePath);
    }
  }, [subscribePath]);

  // ✅ Ne jamais disparaître : si pas de sync, on affiche quand même le calendrier.
  if (!subscribePath) return null;

  return (
    <details
      className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-xs font-semibold text-slate-900">Calendrier</p>
            <p className="text-[11px] text-slate-500">
              {hasSync ? "iCal synchronisé" : "iCal non synchronisé"}
            </p>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="px-4 pb-4">
        <div className="mt-2 overflow-hidden rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
          <DayPicker
            mode="single"
            numberOfMonths={1}
            locale={fr}
            weekStartsOn={1}
            showOutsideDays={false}
            disabled={disabled}
            classNames={{
              month: "w-full",
              caption: "flex items-center justify-between mb-2",
              caption_label: "text-xs font-semibold text-slate-900",
              nav: "flex items-center gap-1",
              nav_button:
                "h-8 w-8 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50",
              table: "w-full border-collapse",
              head_cell:
                "text-[10px] font-medium uppercase tracking-wider text-slate-500 py-1",
              cell: "p-0.5",
              day: "h-8 w-8 rounded-xl text-xs font-medium hover:bg-slate-100",
              day_today: "ring-1 ring-slate-300",
              day_disabled:
                "bg-slate-200 text-slate-400 line-through hover:bg-slate-200",
            }}
          />
        </div>

        {/* Optionnel (à activer si tu veux) */}
        {/* <div className="mt-3 flex gap-2">
          <a
            href={webcalHref}
            className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white hover:bg-slate-800"
          >
            S’abonner
          </a>
          <a
            href={downloadPath}
            className="flex-1 rounded-2xl bg-white px-3 py-2 text-center text-xs font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            .ics
          </a>
        </div> */}
      </div>
    </details>
  );
}
