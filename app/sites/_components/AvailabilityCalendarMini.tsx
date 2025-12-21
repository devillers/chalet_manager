// app/sites/_components/AvailabilityCalendarMini.tsx
"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "date-fns/locale";
import { parseISO, startOfDay, isValid } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";

type Props = {
  blockedRanges: BlockedRange[];
  subscribePath?: string;
  downloadPath?: string;
  defaultOpen?: boolean;
};

export function AvailabilityCalendarMini({
  blockedRanges,
  subscribePath = "",
  downloadPath = "",
  defaultOpen = false,
}: Props) {
  const disabled = useMemo(() => {
    const safe = Array.isArray(blockedRanges) ? blockedRanges : [];
    return safe
      .filter((r) => r?.from && r?.to)
      .map((r) => {
        const from = startOfDay(parseISO(r.from));
        const to = startOfDay(parseISO(r.to));
        if (!isValid(from) || !isValid(to)) return null;
        return { from, to };
      })
      .filter((x): x is { from: Date; to: Date } => !!x);
  }, [blockedRanges]);

  const hasSync = disabled.length > 0;

  // Dérive un lien webcal en n'utilisant que des données stables côté serveur
  // pour éviter tout écart d'hydratation.
  const webcalHref = useMemo(() => {
    if (!subscribePath) return "";
    try {
      // URL absolue => conversion http(s) -> webcal
      if (/^https?:\/\//.test(subscribePath)) {
        return subscribePath.replace(/^https?:\/\//, "webcal://");
      }
      // Chemin relatif: convertir uniquement si une base stable est fournie en env
      const base = process.env.NEXT_PUBLIC_SITE_URL;
      if (base) {
        const url = new URL(subscribePath, base);
        return url.toString().replace(/^https?:\/\//, "webcal://");
      }
      // Sinon, garder le chemin relatif afin d'être identique SSR/CSR
      return subscribePath;
    } catch {
      return subscribePath;
    }
  }, [subscribePath]);

  // ✅ Ne pas retourner null : on affiche le calendrier même sans iCal
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
              month_caption: "mb-2 flex items-center justify-between",
              caption_label: "text-xs font-semibold text-slate-900",
              nav: "flex items-center gap-1",
              button_previous:
                "h-8 w-8 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50",
              button_next:
                "h-8 w-8 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50",
              month_grid: "w-full border-collapse",
              weekday:
                "py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500",
              day: "p-0.5",
              day_button:
                "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-rose-200 disabled:text-rose-900 disabled:opacity-100 disabled:hover:bg-rose-200",
            }}
          />
        </div>

        {disabled.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
            <span className="h-3 w-3 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
            <span>Occupé</span>
          </div>
        )}

        {/* Actions visibles seulement si on a des URLs */}
        {(webcalHref || downloadPath) && (
          <div className="mt-3 flex gap-2">
            {webcalHref && (
              <a
                href={webcalHref}
                className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white hover:bg-slate-800"
              >
                S’abonner
              </a>
            )}
            {downloadPath && (
              <a
                href={downloadPath}
                className="flex-1 rounded-2xl bg-white px-3 py-2 text-center text-xs font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                .ics
              </a>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
