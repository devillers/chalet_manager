// app/sites/_components/BookingSidebar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, X } from "lucide-react";
import type { Villa } from "./villa-types";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";
import { AvailabilityCalendarMini } from "./AvailabilityCalendarMini";
import { getSlug, normalizeStringArray } from "./villa-helpers";

interface BookingSidebarProps {
  villa: Villa;
  blockedRanges?: BlockedRange[];
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

export function BookingSidebar({ villa, blockedRanges = [] }: BookingSidebarProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const guestsLabel = "2 adultes · 2 enfants"; // TODO: brancher sur ta vraie UI voyageurs

  const hasMaxGuests = typeof (villa as any).maxGuests === "number" && (villa as any).maxGuests > 0;

  const includedServices = normalizeStringArray((villa as any).conciergePoints);
  const hasIncludedServices = includedServices.length > 0;

  const hasPriceFrom = typeof (villa as any).priceMin === "number" && (villa as any).priceMin > 0;
  const hasPriceTo = typeof (villa as any).priceMax === "number" && (villa as any).priceMax > 0;

  const villaSlug = useMemo(() => getSlug((villa as any).slug), [villa]);

  const contactHref = useMemo(() => {
    const params = new URLSearchParams();
    if (villaSlug) params.set("villa", villaSlug);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    params.set("from", "sidebar");
    return `/contact?${params.toString()}`;
  }, [villaSlug, startDate, endDate]);

  const openRequest = () => {
    if (isDesktop) setOpen(true);
    else router.push(contactHref);
  };

  const hasIcalUrl =
    typeof (villa as any).availabilityIcalUrl === "string" &&
    (villa as any).availabilityIcalUrl.trim().length > 0;
  const subscribePath = villaSlug && hasIcalUrl ? `/api/villas/${villaSlug}/calendar.ics` : "";
  const downloadPath =
    villaSlug && hasIcalUrl ? `/api/villas/${villaSlug}/calendar.ics?download=1` : "";

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
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-amber-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Voyageurs */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Voyageurs
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-700">{guestsLabel}</span>
                {hasMaxGuests ? (
                  <span className="text-[11px] text-slate-500">max. {(villa as any).maxGuests}</span>
                ) : null}
              </div>
            </div>

            {/* ✅ Calendrier : ne dépend plus de blockedRanges non-vide */}
            {villaSlug ? (
              <AvailabilityCalendarMini
                blockedRanges={Array.isArray(blockedRanges) ? blockedRanges : []}
                subscribePath={subscribePath}
                downloadPath={downloadPath}
                defaultOpen={false}
              />
            ) : null}

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
            {hasPriceFrom ? (
              <div className="rounded-2xl bg-slate-900 px-3 py-3 text-slate-50">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                  Estimation pour 7 nuits
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <p className="text-lg font-medium">
                    À partir de{" "}
                    {(villa as any).priceMin.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    €
                  </p>
                  <p className="text-[11px] text-slate-300">hors taxe de séjour</p>
                </div>

                {hasPriceTo && (villa as any).priceMax > (villa as any).priceMin ? (
                  <p className="mt-1 text-[11px] text-slate-300">
                    Jusqu&apos;à{" "}
                    {(villa as any).priceMax.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    € selon la période.
                  </p>
                ) : null}

                <p className="mt-1 text-[11px] text-slate-300">
                  Prix indicatif, à confirmer selon vos dates et votre groupe.
                </p>
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
        context={{ startDate, endDate, guestsLabel }}
      />
    </>
  );
}
