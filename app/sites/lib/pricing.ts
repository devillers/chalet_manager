export type PricingOverride = {
  from: string;
  to: string;
  nightlyPrice: number;
  label?: string | null;
};

export type PricingCalendar = {
  year: number;
  defaultNightlyPrice: number;
  overrides?: PricingOverride[] | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toYmdYear(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const year = Number(ymd.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function getNightlyPriceForYmd(
  ymd: string,
  calendars?: Array<PricingCalendar | null> | null,
  fallbackNightlyPrice?: number,
): number | null {
  const year = toYmdYear(ymd);
  const safeCalendars = Array.isArray(calendars) ? calendars : [];

  const calendar = year
    ? safeCalendars.find((c) => c && typeof c === "object" && c.year === year)
    : null;

  const defaultNightlyPrice = calendar && isFiniteNumber(calendar.defaultNightlyPrice)
    ? calendar.defaultNightlyPrice
    : isFiniteNumber(fallbackNightlyPrice)
      ? fallbackNightlyPrice
      : null;

  const overrides = Array.isArray(calendar?.overrides) ? calendar!.overrides : [];
  for (const o of overrides) {
    if (!o || typeof o !== "object") continue;
    const from = typeof o.from === "string" ? o.from : "";
    const to = typeof o.to === "string" ? o.to : "";
    if (!from || !to) continue;
    if (ymd < from || ymd > to) continue;
    if (isFiniteNumber(o.nightlyPrice)) return o.nightlyPrice;
  }

  return defaultNightlyPrice;
}

