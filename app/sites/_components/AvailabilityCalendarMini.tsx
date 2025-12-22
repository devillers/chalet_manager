// app/sites/_components/AvailabilityCalendarMini.tsx
"use client";

import { useMemo } from "react";
import { DayPicker, type DayButtonProps, type DateRange } from "react-day-picker";
import { fr } from "date-fns/locale";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";
import { getNightlyPriceForYmd, type PricingCalendar } from "../lib/pricing";

type Props = {
  blockedRangesIcal: BlockedRange[];
  blockedRangesManual: BlockedRange[];
  pricingCalendars?: PricingCalendar[] | null;
  fallbackNightlyPrice?: number;
  showNightlyPrice?: boolean;
  numberOfMonths?: number;
  defaultOpen?: boolean;
  selectionMode?: "none" | "range";
  selectedRange?: DateRange | undefined;
  onSelectRange?: (range: DateRange | undefined) => void;
};

export function AvailabilityCalendarMini({
  blockedRangesIcal,
  blockedRangesManual,
  pricingCalendars,
  fallbackNightlyPrice,
  showNightlyPrice = true,
  numberOfMonths = 1,
  defaultOpen = false,
  selectionMode = "none",
  selectedRange,
  onSelectRange,
}: Props) {
  const overrideMatchers = useMemo(() => {
    const safeCalendars = Array.isArray(pricingCalendars) ? pricingCalendars : [];
    const out: Array<{ from: Date; to: Date }> = [];

    for (const c of safeCalendars) {
      if (!c || typeof c !== "object") continue;
      const overrides = Array.isArray(c.overrides) ? c.overrides : [];
      for (const o of overrides) {
        if (!o || typeof o !== "object") continue;
        const fromStr = typeof o.from === "string" ? o.from : "";
        const toStr = typeof o.to === "string" ? o.to : "";
        if (!fromStr || !toStr) continue;
        const from = startOfDay(parseISO(fromStr));
        const to = startOfDay(parseISO(toStr));
        if (!isValid(from) || !isValid(to)) continue;
        out.push({ from, to });
      }
    }

    return out;
  }, [pricingCalendars]);

  const icalMatchers = useMemo(() => {
    const safe = Array.isArray(blockedRangesIcal) ? blockedRangesIcal : [];
    return safe
      .filter((r) => r?.from && r?.to)
      .map((r) => {
        const from = startOfDay(parseISO(r.from));
        const to = startOfDay(parseISO(r.to));
        if (!isValid(from) || !isValid(to)) return null;
        return { from, to };
      })
      .filter((x): x is { from: Date; to: Date } => !!x);
  }, [blockedRangesIcal]);

  const manualMatchers = useMemo(() => {
    const safe = Array.isArray(blockedRangesManual) ? blockedRangesManual : [];
    return safe
      .filter((r) => r?.from && r?.to)
      .map((r) => {
        const from = startOfDay(parseISO(r.from));
        const to = startOfDay(parseISO(r.to));
        if (!isValid(from) || !isValid(to)) return null;
        return { from, to };
      })
      .filter((x): x is { from: Date; to: Date } => !!x);
  }, [blockedRangesManual]);

  const disabled = useMemo(() => [...icalMatchers, ...manualMatchers], [icalMatchers, manualMatchers]);

  const hasSync = icalMatchers.length > 0;

  function AvailabilityDayButton(props: DayButtonProps) {
    const { day, modifiers, className, children, ...buttonProps } = props;
    const ymd = format(day.date, "yyyy-MM-dd");
    const nightlyPrice = showNightlyPrice
      ? getNightlyPriceForYmd(ymd, pricingCalendars, fallbackNightlyPrice)
      : null;
    const isIcal = Boolean(modifiers?.blockedIcal);
    const isManual = Boolean(modifiers?.blockedManual);
    const isOverride = Boolean(modifiers?.override);
    const isToday = Boolean(modifiers?.today);
    const isRangeStart = Boolean((modifiers as any)?.range_start);
    const isRangeEnd = Boolean((modifiers as any)?.range_end);
    const isRangeMiddle = Boolean((modifiers as any)?.range_middle);
    const isSelected = Boolean((modifiers as any)?.selected);
    const tone = isIcal ? "ical" : isManual ? "manual" : isOverride ? "override" : "default";
    return (
      <button
        {...buttonProps}
        className={[
          className || "",
          "inline-flex h-8 w-8 flex-col items-center justify-center rounded-xl text-[11px] font-semibold leading-none ring-1 transition",
          tone === "ical"
            ? "bg-red-100 text-red-950 ring-red-200"
            : tone === "manual"
              ? "bg-rose-100 text-rose-950 ring-rose-200"
              : tone === "override" && !isRangeStart && !isRangeEnd && !isRangeMiddle && !isSelected
                ? "bg-amber-100 text-amber-950 ring-amber-200 hover:bg-amber-100"
              : isRangeStart || isRangeEnd
                ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-900"
                : isRangeMiddle
                  ? "bg-slate-900/10 text-slate-900 ring-slate-200"
                  : isSelected
                    ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-900"
                    : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-100",
          isToday ? "shadow-[0_0_0_2px_#bd9254]" : "",
        ].join(" ")}
      >
        <span>{children}</span>
        {showNightlyPrice && nightlyPrice != null ? (
          <span
            className={[
              "mt-0.5 text-[8px] font-medium",
              tone === "ical"
                ? "text-red-900"
                : tone === "manual"
                  ? "text-rose-900"
                  : isRangeStart || isRangeEnd || isSelected
                    ? "text-white/80"
                    : tone === "override"
                      ? "text-amber-900"
                      : "text-slate-500",
            ].join(" ")}
          >
            {nightlyPrice}€
          </span>
        ) : null}
      </button>
    );
  }

  const calendar = (
    <div className="mt-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
      {selectionMode === "range" ? (
        <DayPicker
          mode="range"
          numberOfMonths={numberOfMonths}
          locale={fr}
          weekStartsOn={1}
          showOutsideDays={false}
          disabled={disabled}
          excludeDisabled
          selected={selectedRange}
          onSelect={onSelectRange}
          modifiers={{
            blockedIcal: icalMatchers,
            blockedManual: manualMatchers,
            override: overrideMatchers,
          }}
          components={{ DayButton: AvailabilityDayButton }}
          classNames={{
            months: "flex flex-col items-center gap-4",
            month: "w-fit",
            month_caption: "mb-2 flex items-center justify-between px-1",
            caption_label: "text-sm font-semibold text-slate-900",
            nav: "flex items-center gap-1",
            button_previous:
              "grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50",
            button_next:
              "grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50",
            month_grid: "mx-auto w-fit border-collapse",
            weekday: "py-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500",
            day: "p-0.5 text-center",
            day_button: "focus:outline-none",
          }}
        />
      ) : (
        <DayPicker
          mode="single"
          numberOfMonths={numberOfMonths}
          locale={fr}
          weekStartsOn={1}
          showOutsideDays={false}
          disabled={disabled}
          modifiers={{
            blockedIcal: icalMatchers,
            blockedManual: manualMatchers,
            override: overrideMatchers,
          }}
          components={{ DayButton: AvailabilityDayButton }}
          classNames={{
            months: "flex flex-col items-center gap-4",
            month: "w-fit",
            month_caption: "mb-2 flex items-center justify-between px-1",
            caption_label: "text-sm font-semibold text-slate-900",
            nav: "flex items-center gap-1",
            button_previous:
              "grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50",
            button_next:
              "grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50",
            month_grid: "mx-auto w-fit border-collapse",
            weekday: "py-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500",
            day: "p-0.5 text-center",
            day_button: "focus:outline-none",
          }}
        />
      )}
    </div>
  );

  const legend = (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
        {icalMatchers.length > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-red-200 ring-1 ring-red-300" />
            <span>Occupé (iCal)</span>
          </span>
        ) : null}
        {manualMatchers.length > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
            <span>Bloqué (manuel)</span>
          </span>
        ) : null}
        {overrideMatchers.length > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-200" />
            <span>Prix personnalisé</span>
          </span>
        ) : null}
      </div>
    </>
  );

  if (selectionMode === "range") {
    return (
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 pb-4 pt-4">
          {calendar}
          {legend}
        </div>
      </div>
    );
  }

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
        {calendar}
        {legend}
      </div>
    </details>
  );
}
