// app/sites/_components/BookingSidebar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, ChevronDown, Minus, Plus, X } from "lucide-react";
import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Villa } from "./villa-types";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";
import { AvailabilityCalendarMini } from "./AvailabilityCalendarMini";
import { getNightlyPriceForYmd } from "../lib/pricing";
import { getSlug, normalizeStringArray } from "./villa-helpers";

interface BookingSidebarProps {
  villa: Villa;
  blockedRangesIcal?: BlockedRange[];
  blockedRangesManual?: BlockedRange[];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);

    onChange();

    if (media.addEventListener) media.addEventListener("change", onChange);
    else media.addListener(onChange);

    return () => {
      if (media.removeEventListener) media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

type RequestContext = {
  startDate?: string;
  endDate?: string;
  guestsLabel?: string;
};

function toDisplayDate(ymd: string) {
  const raw = String(ymd || "").trim();
  if (!raw) return "";
  const d = startOfDay(parseISO(raw));
  if (!isValid(d)) return "";
  return format(d, "dd/MM/yyyy");
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatEur(value: number) {
  return EUR.format(value);
}

function RequestModal({
  open,
  onClose,
  villa,
  context,
}: {
  open: boolean;
  onClose: () => void;
  villa: Villa;
  context: RequestContext;
}) {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const defaultMessage = useMemo(() => {
    const lines: string[] = [`Bonjour, je souhaite faire une demande pour ${villa.name}.`];
    if (context.startDate && context.endDate) {
      lines.push(`Dates : du ${context.startDate} au ${context.endDate}`);
    }
    if (context.guestsLabel) {
      lines.push(`Voyageurs : ${context.guestsLabel}`);
    }
    lines.push("", "Merci de me recontacter avec vos disponibilités et conditions.");
    return lines.join("\n");
  }, [villa.name, context.startDate, context.endDate, context.guestsLabel]);

  useEffect(() => {
    if (!open) return;

    setIsSubmitting(false);
    setIsSuccess(false);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => firstInputRef.current?.focus(), 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const villaSlug = getSlug((villa as any).slug);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Demande d’information
            </p>
            <h3 id="request-title" className="mt-1 text-lg font-semibold text-slate-900">
              {villa.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-auto px-5 py-4">
          {isSuccess ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-800">
                Demande envoyée. Nous revenons vers vous rapidement.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-amber-800"
              >
                Continuer la visite
              </button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;

                const fd = new FormData(e.currentTarget);
                const payload = {
                  villaName: villa.name,
                  villaSlug,
                  startDate: context.startDate,
                  endDate: context.endDate,
                  guestsLabel: context.guestsLabel,
                  name: String(fd.get("name") || ""),
                  email: String(fd.get("email") || ""),
                  phone: String(fd.get("phone") || ""),
                  message: String(fd.get("message") || ""),
                };

                try {
                  setIsSubmitting(true);

                  const res = await fetch("/api/inquiry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  if (!res.ok) throw new Error("Request failed");
                  setIsSuccess(true);
                } catch {
                  alert("Impossible d’envoyer la demande. Réessaie ou utilise la page contact.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Nom
                  </label>
                  <input
                    ref={firstInputRef}
                    name="name"
                    required
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Téléphone
                  </label>
                  <input
                    name="phone"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                    placeholder="+33…"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                  placeholder="vous@exemple.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Message
                </label>
                <textarea
                  name="message"
                  rows={5}
                  defaultValue={defaultMessage}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-amber-800 disabled:opacity-60"
                >
                  {isSubmitting ? "Envoi…" : "Envoyer la demande"}
                  <ArrowRight className="h-3 w-3" />
                </button>

                <p className="text-[10px] leading-relaxed text-slate-500">
                  Réponse rapide • Sans engagement
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingSidebar({
  villa,
  blockedRangesIcal = [],
  blockedRangesManual = [],
}: BookingSidebarProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guests, setGuests] = useState(() => {
    const max =
      typeof (villa as any).maxGuests === "number" && (villa as any).maxGuests > 0
        ? Number((villa as any).maxGuests)
        : null;
    const adults = max ? Math.min(2, max) : 2;
    const children = max ? Math.min(2, Math.max(0, max - adults)) : 2;
    return { adults, children };
  });

  const guestsTotal = guests.adults + guests.children;
  const guestsLabel = useMemo(() => {
    const parts: string[] = [];
    if (guests.adults > 0) parts.push(`${guests.adults} adulte${guests.adults > 1 ? "s" : ""}`);
    if (guests.children > 0) parts.push(`${guests.children} enfant${guests.children > 1 ? "s" : ""}`);
    return parts.join(" · ");
  }, [guests.adults, guests.children]);

  const hasMaxGuests = typeof (villa as any).maxGuests === "number" && (villa as any).maxGuests > 0;
  const maxGuests = hasMaxGuests ? Number((villa as any).maxGuests) : null;

  const includedServices = normalizeStringArray((villa as any).conciergePoints);
  const hasIncludedServices = includedServices.length > 0;

  const hasPriceFrom = typeof (villa as any).priceMin === "number" && (villa as any).priceMin > 0;
  const hasPriceTo = typeof (villa as any).priceMax === "number" && (villa as any).priceMax > 0;
  const hasPricing =
    hasPriceFrom ||
    (Array.isArray((villa as any).pricingCalendars) && (villa as any).pricingCalendars.length > 0);

  const villaSlug = useMemo(() => getSlug((villa as any).slug), [villa]);

  const contactHref = useMemo(() => {
    const params = new URLSearchParams();
    if (villaSlug) params.set("villa", villaSlug);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (Number.isFinite(guestsTotal) && guestsTotal > 0) params.set("guests", String(guestsTotal));
    if (Number.isFinite(guests.adults) && guests.adults > 0) params.set("adults", String(guests.adults));
    if (Number.isFinite(guests.children) && guests.children > 0) params.set("children", String(guests.children));
    params.set("from", "sidebar");
    return `/contact?${params.toString()}`;
  }, [villaSlug, startDate, endDate, guestsTotal, guests.adults, guests.children]);

  const openRequest = () => {
    if (isDesktop) setOpen(true);
    else router.push(contactHref);
  };

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = startDate ? startOfDay(parseISO(startDate)) : undefined;
    const to = endDate ? startOfDay(parseISO(endDate)) : undefined;
    const fromOk = from && isValid(from) ? from : undefined;
    const toOk = to && isValid(to) ? to : undefined;
    if (!fromOk && !toOk) return undefined;
    return { from: fromOk, to: toOk };
  }, [startDate, endDate]);

  const stayPricing = useMemo(() => {
    if (!startDate || !endDate) return null;
    const from = startOfDay(parseISO(startDate));
    const to = startOfDay(parseISO(endDate));
    if (!isValid(from) || !isValid(to)) return null;

    const nights = differenceInCalendarDays(to, from);
    if (nights <= 0) return null;

    let total = 0;
    let minNightly = Number.POSITIVE_INFINITY;
    let maxNightly = 0;

    const calendars = Array.isArray((villa as any).pricingCalendars) ? (villa as any).pricingCalendars : [];
    const fallback = typeof (villa as any).priceMin === "number" ? (villa as any).priceMin : undefined;

    for (let i = 0; i < nights; i += 1) {
      const day = addDays(from, i);
      const ymd = format(day, "yyyy-MM-dd");
      const nightly = getNightlyPriceForYmd(ymd, calendars, fallback);
      if (typeof nightly !== "number" || !Number.isFinite(nightly)) continue;
      total += nightly;
      if (nightly < minNightly) minNightly = nightly;
      if (nightly > maxNightly) maxNightly = nightly;
    }

    if (!Number.isFinite(total) || total <= 0) return null;

    const avgNightly = total / nights;
    const perPersonTotal = guestsTotal > 0 ? total / guestsTotal : null;
    const perPersonNight = guestsTotal > 0 ? avgNightly / guestsTotal : null;

    return {
      nights,
      total,
      avgNightly,
      minNightly: Number.isFinite(minNightly) ? minNightly : null,
      maxNightly: Number.isFinite(maxNightly) && maxNightly > 0 ? maxNightly : null,
      perPersonTotal,
      perPersonNight,
    };
  }, [startDate, endDate, guestsTotal, villa]);

  return (
    <>
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <div className="space-y-4 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-100 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Votre séjour
            </p>
            {hasIncludedServices ? (
              <p className="text-[11px] text-slate-500">Conciergerie incluse*</p>
            ) : null}
          </div>

          <form className="space-y-3">
            {/* Dates */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Dates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    className="relative h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 pr-9 text-left text-xs text-slate-800 outline-none transition focus:border-amber-700 focus:bg-white"
                    aria-haspopup="dialog"
                    aria-expanded={calendarOpen}
                  >
                    <span className={startDate ? "" : "text-slate-400"}>
                      {toDisplayDate(startDate) || "jj/mm/aaaa"}
                    </span>
                    <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    className="relative h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 pr-9 text-left text-xs text-slate-800 outline-none transition focus:border-amber-700 focus:bg-white"
                    aria-haspopup="dialog"
                    aria-expanded={calendarOpen}
                  >
                    <span className={endDate ? "" : "text-slate-400"}>
                      {toDisplayDate(endDate) || "jj/mm/aaaa"}
                    </span>
                    <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </button>
                </div>
              </div>
              {/* ✅ Sélection des dates via le calendrier (dates bloquées visibles + non cliquables) */}
              {calendarOpen && villaSlug ? (
                <div className="mt-2">
                  <AvailabilityCalendarMini
                    blockedRangesIcal={Array.isArray(blockedRangesIcal) ? blockedRangesIcal : []}
                    blockedRangesManual={Array.isArray(blockedRangesManual) ? blockedRangesManual : []}
                    pricingCalendars={
                      Array.isArray((villa as any).pricingCalendars) ? (villa as any).pricingCalendars : []
                    }
                    fallbackNightlyPrice={
                      typeof (villa as any).priceMin === "number" ? (villa as any).priceMin : undefined
                    }
                    numberOfMonths={isDesktop ? 2 : 1}
                    selectionMode="range"
                    selectedRange={selectedRange}
                    onSelectRange={(range) => {
                      if (!range?.from) {
                        setStartDate("");
                        setEndDate("");
                        return;
                      }
                      setStartDate(format(range.from, "yyyy-MM-dd"));
                      setEndDate(range.to ? format(range.to, "yyyy-MM-dd") : "");
                      if (range.to) setCalendarOpen(false);
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="flex-1 rounded-full bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(false)}
                      className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white hover:bg-slate-800"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Voyageurs */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Voyageurs
              </label>
              <button
                type="button"
                onClick={() => setGuestsOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                aria-haspopup="dialog"
                aria-expanded={guestsOpen}
              >
                <span className="text-xs text-slate-700">{guestsLabel}</span>
                <span className="inline-flex items-center gap-2">
                  {maxGuests ? (
                    <span className="text-[11px] text-slate-500">max. {maxGuests}</span>
                  ) : null}
                  <ChevronDown
                    className={[
                      "h-4 w-4 text-slate-400 transition-transform",
                      guestsOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </span>
              </button>

              {guestsOpen ? (
                <div className="mt-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Adultes</p>
                      <p className="text-[11px] text-slate-500">13 ans et +</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGuests((g) => ({ ...g, adults: Math.max(1, g.adults - 1) }))
                        }
                        disabled={guests.adults <= 1}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                        aria-label="Retirer un adulte"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-slate-900">
                        {guests.adults}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGuests((g) => {
                            if (maxGuests && g.adults + g.children >= maxGuests) return g;
                            return { ...g, adults: g.adults + 1 };
                          })
                        }
                        disabled={Boolean(maxGuests && guests.adults + guests.children >= maxGuests)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                        aria-label="Ajouter un adulte"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Enfants</p>
                      <p className="text-[11px] text-slate-500">2–12 ans</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuests((g) => ({ ...g, children: Math.max(0, g.children - 1) }))}
                        disabled={guests.children <= 0}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                        aria-label="Retirer un enfant"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-slate-900">
                        {guests.children}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGuests((g) => {
                            if (maxGuests && g.adults + g.children >= maxGuests) return g;
                            return { ...g, children: g.children + 1 };
                          })
                        }
                        disabled={Boolean(maxGuests && guests.adults + guests.children >= maxGuests)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                        aria-label="Ajouter un enfant"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total</span>
                    <span>
                      {guestsTotal} voyageur{guestsTotal > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Services inclus */}
            {hasIncludedServices ? (
              <div className="space-y-1 text-[11px] text-slate-600">
                <p className="font-medium uppercase tracking-[0.2em] text-slate-500">
                  Services inclus
                </p>
                <ul className="space-y-1">
                  {includedServices.slice(0, 6).map((service, index) => (
                    <li key={`${service}-${index}`}>{service}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Prix */}
            {hasPricing ? (
              <div className="rounded-2xl bg-slate-900 px-4 py-4 text-slate-50">
                {stayPricing ? (
                  <>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                      Estimation pour {stayPricing.nights} nuit{stayPricing.nights > 1 ? "s" : ""}
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <p className="text-2xl font-semibold tracking-tight">
                        {formatEur(stayPricing.total)}
                      </p>
                      <p className="text-[11px] text-slate-300">hors taxe de séjour</p>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-300">
                      {formatEur(stayPricing.avgNightly)} / nuit (moy.) • {guestsTotal}{" "}
                      voyageur{guestsTotal > 1 ? "s" : ""}
                      {stayPricing.perPersonNight ? ` • ≈ ${formatEur(stayPricing.perPersonNight)} / pers. / nuit` : ""}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-300">
                      Prix indicatif, à confirmer selon vos dates et votre groupe.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                      Estimation
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-50">
                      Choisissez vos dates pour voir le prix.
                    </p>

                    {hasPriceFrom ? (
                      <p className="mt-2 text-[11px] text-slate-300">
                        À partir de {formatEur(Number((villa as any).priceMin))} / nuit.
                      </p>
                    ) : null}

                    {hasPriceFrom && hasPriceTo && (villa as any).priceMax > (villa as any).priceMin ? (
                      <p className="mt-1 text-[11px] text-slate-300">
                        Jusqu&apos;à {formatEur(Number((villa as any).priceMax))} / nuit selon la période.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {/* CTA */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={openRequest}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-amber-800"
              >
                Faire une demande
                <ArrowRight className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => router.push(contactHref)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-900 bg-white px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 transition hover:border-amber-800 hover:text-amber-900"
              >
                Réserver
                <Calendar className="h-3 w-3" />
              </button>

              <p className="text-[10px] leading-relaxed text-slate-500">
                Réponse rapide • Sans engagement
              </p>

              <noscript>
                <a href={contactHref} className="text-xs underline">
                  Accéder à la page contact
                </a>
              </noscript>
            </div>

            {hasIncludedServices ? (
              <p className="text-[10px] leading-relaxed text-slate-500">
                *Certains services peuvent être ajustés selon la saison. Détails complets
                avant confirmation.
              </p>
            ) : null}
          </form>
        </div>
      </aside>

      <RequestModal
        open={open}
        onClose={() => setOpen(false)}
        villa={villa}
        context={{
          startDate: startDate ? toDisplayDate(startDate) : "",
          endDate: endDate ? toDisplayDate(endDate) : "",
          guestsLabel,
        }}
      />
    </>
  );
}
