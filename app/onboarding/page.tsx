// app/onboarding/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Flame, Waves, Dumbbell, Wind, Wifi, Car } from "lucide-react";

function clampText(txt: string, max = 220) {
  const s = String(txt || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + "…";
}

function nonEmpty(v?: string | null) {
  return typeof v === "string" && v.trim().length > 0;
}

function splitLines(input?: string | null) {
  if (!input) return [] as string[];
  return String(input)
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type PricingMode = "day" | "week" | "month";
type PricingOverride = { from: string; to: string; nightlyPrice: number; label?: string };
type PricingRange = { from: Date; to: Date };
type ManualBlockedPeriod = { from: string; to: string; comment: string };

type BlockedRange = { from: string; to: string };

function toYmd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function rangesOverlap(a: { from: Date; to: Date }, b: { from: Date; to: Date }) {
  return a.from <= b.to && b.from <= a.to;
}

function normalizePricingOverrides(
  year: number,
  defaultNightlyPrice: number,
  overrides: PricingOverride[],
): PricingOverride[] {
  if (!Number.isFinite(year) || !Number.isInteger(year)) return [];
  if (!Number.isFinite(defaultNightlyPrice) || !Number.isInteger(defaultNightlyPrice)) return [];

  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const daysInYear = differenceInCalendarDays(startOfDay(new Date(year + 1, 0, 1)), yearStart);
  if (!Number.isFinite(daysInYear) || daysInYear <= 0) return [];

  const dayPrices = Array.from({ length: daysInYear }, () => defaultNightlyPrice);
  const dayLabels: Array<string | undefined> = Array.from({ length: daysInYear }, () => undefined);

  for (const o of overrides) {
    const price = Number(o?.nightlyPrice);
    if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) continue;

    const labelRaw = typeof o?.label === "string" ? o.label.trim() : "";
    const label = labelRaw ? labelRaw.slice(0, 80) : undefined;

    const fromDate = startOfDay(parseISO(String(o?.from || "")));
    const toDate = startOfDay(parseISO(String(o?.to || "")));
    if (!isValid(fromDate) || !isValid(toDate)) continue;
    if (fromDate > toDate) continue;
    if (fromDate < yearStart || toDate > yearEnd) continue;

    const fromIdx = differenceInCalendarDays(fromDate, yearStart);
    const toIdx = differenceInCalendarDays(toDate, yearStart);
    if (fromIdx < 0 || toIdx >= daysInYear) continue;

    for (let i = fromIdx; i <= toIdx; i++) {
      dayPrices[i] = price;
      dayLabels[i] = label;
    }
  }

  const normalized: PricingOverride[] = [];
  for (let i = 0; i < dayPrices.length; i++) {
    const price = dayPrices[i];
    const label = dayLabels[i];
    const isCustom = price !== defaultNightlyPrice || (typeof label === "string" && label.length > 0);
    if (!isCustom) continue;

    const startIdx = i;
    while (i + 1 < dayPrices.length) {
      const nextPrice = dayPrices[i + 1];
      const nextLabel = dayLabels[i + 1];
      const nextIsCustom =
        nextPrice !== defaultNightlyPrice || (typeof nextLabel === "string" && nextLabel.length > 0);
      if (!nextIsCustom) break;
      if (nextPrice !== price) break;
      if ((nextLabel ?? "") !== (label ?? "")) break;
      i++;
    }
    const endIdx = i;

    normalized.push({
      from: toYmd(addDays(yearStart, startIdx)),
      to: toYmd(addDays(yearStart, endIdx)),
      nightlyPrice: price,
      ...(label ? { label } : {}),
    });
  }

  return normalized;
}

function normalizeManualBlockedPeriods(
  year: number,
  periods: ManualBlockedPeriod[],
): ManualBlockedPeriod[] {
  if (!Number.isFinite(year) || !Number.isInteger(year)) return [];

  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const daysInYear = differenceInCalendarDays(startOfDay(new Date(year + 1, 0, 1)), yearStart);
  if (!Number.isFinite(daysInYear) || daysInYear <= 0) return [];

  const dayComments: Array<string | undefined> = Array.from({ length: daysInYear }, () => undefined);

  for (const p of periods) {
    const commentRaw = typeof p?.comment === "string" ? p.comment.trim() : "";
    const comment = commentRaw ? commentRaw.slice(0, 120) : "";
    if (!comment) continue;

    const fromDate = startOfDay(parseISO(String(p?.from || "")));
    const toDate = startOfDay(parseISO(String(p?.to || "")));
    if (!isValid(fromDate) || !isValid(toDate)) continue;
    if (fromDate > toDate) continue;
    if (fromDate < yearStart || toDate > yearEnd) continue;

    const fromIdx = differenceInCalendarDays(fromDate, yearStart);
    const toIdx = differenceInCalendarDays(toDate, yearStart);
    if (fromIdx < 0 || toIdx >= daysInYear) continue;

    for (let i = fromIdx; i <= toIdx; i++) dayComments[i] = comment;
  }

  const normalized: ManualBlockedPeriod[] = [];
  for (let i = 0; i < dayComments.length; i++) {
    const comment = dayComments[i];
    if (!comment) continue;

    const startIdx = i;
    while (i + 1 < dayComments.length && dayComments[i + 1] === comment) i++;
    const endIdx = i;

    normalized.push({
      from: toYmd(addDays(yearStart, startIdx)),
      to: toYmd(addDays(yearStart, endIdx)),
      comment,
    });
  }

  return normalized;
}

function computePricingMinMax(defaultNightlyPrice: number, overrides: PricingOverride[]) {
  if (!Number.isFinite(defaultNightlyPrice) || !Number.isInteger(defaultNightlyPrice)) return null;
  const prices = [defaultNightlyPrice, ...overrides.map((o) => Number(o.nightlyPrice))].filter((n) =>
    Number.isFinite(n),
  );
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max: max === min ? undefined : max };
}

function getNightlyPriceForDay(ymd: string, defaultNightlyPrice: number, overrides: PricingOverride[]) {
  for (const o of overrides) {
    if (ymd >= o.from && ymd <= o.to) return o.nightlyPrice;
  }
  return defaultNightlyPrice;
}

function sameOverrides(a: PricingOverride[], b: PricingOverride[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (!ai || !bi) return false;
    if (ai.from !== bi.from || ai.to !== bi.to || ai.nightlyPrice !== bi.nightlyPrice) return false;
    if ((ai.label ?? "") !== (bi.label ?? "")) return false;
  }
  return true;
}

function sameManualBlockedPeriods(a: ManualBlockedPeriod[], b: ManualBlockedPeriod[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (!ai || !bi) return false;
    if (ai.from !== bi.from || ai.to !== bi.to || ai.comment !== bi.comment) return false;
  }
  return true;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none",
        "focus:border-slate-300 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none",
        "focus:border-slate-300 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

const schema = z
  .object({
    // Propriétaire
    ownerName: z.string().min(2, "Nom requis"),
    ownerEmail: z.string().email("Email invalide"),
    ownerPhone: z.string().min(6, "Téléphone requis"),

    // Villa identités / adresse
    name: z.string().min(2, "Nom du bien requis"),
    street: z.string().min(2, "Adresse requise"),
    postalCode: z.string().min(3, "Code postal requis"),
    city: z.string().min(2, "Ville requise"),
    region: z.string().min(2, "Région requise"),
    country: z.string().min(2, "Pays requis"),

    // Capacités
    maxGuests: z.number().finite().int().min(1, "≥ 1"),
    bedrooms: z.number().finite().int().min(1, "≥ 1"),
    bathrooms: z.number().finite().int().min(1, "≥ 1"),

    // Grille tarifaire (année civile)
    pricingYear: z.number().finite().int().min(2000, "2000–2100").max(2100, "2000–2100"),
    pricingDefaultNightlyPrice: z.number().finite().int().min(0, "≥ 0"),

    // Disponibilités
    availabilityIcalUrl: z.string().optional(),

    // Ménage
    cleaningIncluded: z.boolean().default(false),
    cleaningPrice: z.number().finite().int().min(0, "≥ 0").optional(),

    // Descriptions
    shortDescription: z.string().min(10, "Description courte trop courte"),
    longDescription: z.string().min(50, "Description longue trop courte (≥ 50)"),

    // Environs
    surroundingsIntro: z.string().max(800, "Trop long").optional(),
    environmentType: z.string().max(200, "Trop long").optional(),
    distancesText: z.string().max(1200, "Trop long").optional(),

    // Textareas multi-lignes pour listes (avec choix + saisie libre)
    quickHighlightsText: z.string().max(800, "Trop long").optional(),
    keyAmenitiesText: z.string().max(1200, "Trop long").optional(),

    // Blocs d'info
    goodToKnowText: z.string().max(1200, "Trop long").optional(),
    conciergeSubtitle: z.string().max(300, "Trop long").optional(),
    conciergePointsText: z.string().max(1200, "Trop long").optional(),
    extraInfoText: z.string().max(1200, "Trop long").optional(),

    // (Similars/testimonials: gérés en Studio)
  })
  .superRefine((values, ctx) => {
    // Si ménage = oui, prix ménage requis
    if (values.cleaningIncluded && typeof values.cleaningPrice !== "number") {
      ctx.addIssue({ code: "custom", path: ["cleaningPrice"], message: "Requis si ménage = oui" });
    }

    const ical = typeof values.availabilityIcalUrl === "string" ? values.availabilityIcalUrl.trim() : "";
    if (ical) {
      const ok = z.string().url().safeParse(ical).success;
      if (!ok) ctx.addIssue({ code: "custom", path: ["availabilityIcalUrl"], message: "URL iCal invalide" });
    }
  });

type FormValues = z.infer<typeof schema>;
type PickedImage = { file: File; url: string; name: string; size: number };

type OnboardingResult = {
  publicUrl?: string;
  ownerUrl?: string;
  error?: string;
};

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);

  const [picked, setPicked] = useState<PickedImage[]>([]);
  const pickedRef = useRef<PickedImage[]>([]);
  const [heroIndex, setHeroIndex] = useState<number>(0);

  const [pricingMode, setPricingMode] = useState<PricingMode>("week");
  const [pricingSelection, setPricingSelection] = useState<PricingRange | null>(null);
  const [pricingAnchor, setPricingAnchor] = useState<Date | null>(null);
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverride[]>([]);
  const [pricingApplyPrice, setPricingApplyPrice] = useState<number>(200);
  const [pricingApplyLabel, setPricingApplyLabel] = useState<string>("");
  const [pricingMonth, setPricingMonth] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const pricingMonthTouchedRef = useRef(false);
  const [manualBlockedPeriods, setManualBlockedPeriods] = useState<ManualBlockedPeriod[]>([]);
  const [blockComment, setBlockComment] = useState<string>("");
  const [blockError, setBlockError] = useState<string>("");

  const [icalBlockedRanges, setIcalBlockedRanges] = useState<BlockedRange[]>([]);
  const [icalBlockedLoading, setIcalBlockedLoading] = useState(false);
  const [icalBlockedError, setIcalBlockedError] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<OnboardingResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
  } = useForm<FormValues>({
    // Cast to avoid resolver type mismatch across differing transitive types in IDE
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      country: "France",
      maxGuests: 1,
      bedrooms: 1,
      bathrooms: 1,
      pricingYear: new Date().getFullYear(),
      pricingDefaultNightlyPrice: 200,
      availabilityIcalUrl: "",
      cleaningIncluded: false,
    },
    mode: "onTouched",
  });

  const v = watch();
  const pricingStats = computePricingMinMax(v.pricingDefaultNightlyPrice, pricingOverrides);

  // Re-centre le calendrier quand l'année change (DayPicker conserve le mois précédent en mode uncontrolled).
  useEffect(() => {
    if (typeof v.pricingYear !== "number" || !Number.isFinite(v.pricingYear)) return;
    const year = Math.trunc(v.pricingYear);
    if (!Number.isFinite(year)) return;
    pricingMonthTouchedRef.current = false;
    setPricingMonth(new Date(year, 0, 1));
  }, [v.pricingYear]);

  // Re-normalise les overrides si l'année / le prix par défaut change
  useEffect(() => {
    if (!Number.isFinite(v.pricingYear) || !Number.isInteger(v.pricingYear)) return;
    if (!Number.isFinite(v.pricingDefaultNightlyPrice) || !Number.isInteger(v.pricingDefaultNightlyPrice))
      return;

    setPricingOverrides((prev) => {
      const next = normalizePricingOverrides(v.pricingYear, v.pricingDefaultNightlyPrice, prev);
      return sameOverrides(prev, next) ? prev : next;
    });
  }, [v.pricingYear, v.pricingDefaultNightlyPrice, setPricingOverrides]);

  // Re-normalise les blocages manuels si l'année change
  useEffect(() => {
    if (!Number.isFinite(v.pricingYear) || !Number.isInteger(v.pricingYear)) return;
    setManualBlockedPeriods((prev) => {
      const next = normalizeManualBlockedPeriods(v.pricingYear, prev);
      return sameManualBlockedPeriods(prev, next) ? prev : next;
    });
  }, [v.pricingYear, setManualBlockedPeriods]);

  // Initialise le prix d'application depuis le prix par défaut
  useEffect(() => {
    if (!Number.isFinite(v.pricingDefaultNightlyPrice) || !Number.isInteger(v.pricingDefaultNightlyPrice))
      return;
    setPricingApplyPrice((prev) =>
      Number.isFinite(prev) && Number.isInteger(prev) && prev >= 0 ? prev : v.pricingDefaultNightlyPrice
    );
  }, [v.pricingDefaultNightlyPrice]);

  // Prévisualisation des dates bloquées via iCal
  useEffect(() => {
    const url = typeof v.availabilityIcalUrl === "string" ? v.availabilityIcalUrl.trim() : "";

    setIcalBlockedError("");
    if (!url) {
      setIcalBlockedRanges([]);
      return;
    }

    const controller = new AbortController();
    pricingMonthTouchedRef.current = false;

    (async () => {
      try {
        setIcalBlockedLoading(true);
        const res = await fetch(`/api/ical/blocked-ranges?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json().catch(() => ({}))) as { ranges?: BlockedRange[] };
        setIcalBlockedRanges(Array.isArray(data.ranges) ? data.ranges : []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setIcalBlockedRanges([]);
        setIcalBlockedError("Impossible de charger l’iCal.");
      } finally {
        setIcalBlockedLoading(false);
      }
    })();

    return () => controller.abort();
  }, [v.availabilityIcalUrl]);

  // Si on charge un iCal et que le mois courant n'affiche aucun blocage,
  // on se positionne automatiquement sur le 1er mois indisponible de l'année.
  useEffect(() => {
    if (pricingMonthTouchedRef.current) return;
    if (!icalBlockedRanges.length) return;

    const year =
      typeof v.pricingYear === "number" && Number.isFinite(v.pricingYear)
        ? Math.trunc(v.pricingYear)
        : new Date().getFullYear();
    const yearStart = startOfDay(new Date(year, 0, 1));
    const yearEnd = startOfDay(new Date(year, 11, 31));

    const within = icalBlockedRanges
      .map((r) => {
        const from = startOfDay(parseISO(String(r?.from || "")));
        const to = startOfDay(parseISO(String(r?.to || "")));
        if (!isValid(from) || !isValid(to)) return null;
        if (to < yearStart || from > yearEnd) return null;
        return { from, to };
      })
      .filter((x): x is { from: Date; to: Date } => Boolean(x))
      .sort((a, b) => a.from.getTime() - b.from.getTime());

    const first = within[0];
    if (!first) return;

    const monthStart = startOfMonth(pricingMonth);
    const monthEnd = endOfMonth(pricingMonth);
    const hasInMonth = within.some((r) => r.from <= monthEnd && monthStart <= r.to);
    if (hasInMonth) return;

    setPricingMonth(startOfMonth(first.from));
  }, [icalBlockedRanges, v.pricingYear, pricingMonth]);

  // Suggestions pré-remplies pour aider la saisie
  const suggestedQuickHighlights = [
    "Vue panoramique",
    "Cheminée",
    "Spa extérieur",
    "Piscine chauffée",
    "Accès pistes"
  ];

  const suggestedAmenities = [
    "Wi-Fi haut débit",
    "Parking privé",
    "Sauna",
    "Salle de sport",
    "Climatisation"
  ];

  const suggestedGoodToKnow = [
    "Check-in 16h / Check-out 10h",
    "Animaux sur demande",
    "Non fumeur",
    "Caution demandée"
  ];

  const suggestedConcierge = [
    "Chef à domicile",
    "Transferts privés",
    "Location de ski",
    "Cours de ski"
  ];

  // Garder une ref à jour pour cleanup unmount
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  // Cleanup blob URLs au unmount
  useEffect(() => {
    return () => {
      pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files || []);
    const imagesOnly = arr.filter((f) => f.type.startsWith("image/"));
    if (!imagesOnly.length) return;

    setPicked((prev) => {
      const merged = [...prev];

      for (const f of imagesOnly) {
        if (merged.length >= 20) break;
        const exists = merged.some((x) => x.name === f.name && x.size === f.size);
        if (exists) continue;

        merged.push({
          file: f,
          name: f.name,
          size: f.size,
          url: URL.createObjectURL(f),
        });
      }

      // Ajuster le hero si besoin (évite l'accès à picked stale)
      if (prev.length === 0) {
        setHeroIndex(0);
      } else {
        setHeroIndex((h) => Math.min(h, Math.max(0, merged.length - 1)));
      }

      return merged;
    });
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setPicked((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);

      const next = prev.filter((_, i) => i !== index);
      setHeroIndex((h) => {
        if (next.length === 0) return 0;
        if (index === h) return 0;
        if (index < h) return Math.max(0, h - 1);
        return Math.min(h, next.length - 1);
      });
      return next;
    });
  }

  function toggleHero(index: number) {
    setHeroIndex(index);
  }

  async function goNext() {
    const ok = await trigger(["ownerName", "ownerEmail", "ownerPhone"]);
    if (ok) setStep(2);
  }

  function goBack() {
    setStep(1);
  }

  const onSubmit = handleSubmit(async (formValues) => {
    setSubmitting(true);
    setServerError("");
    setResult(null);

    try {
      const fd = new FormData();

      fd.append("ownerName", formValues.ownerName);
      fd.append("ownerEmail", formValues.ownerEmail);
      fd.append("ownerPhone", formValues.ownerPhone);

      fd.append("name", formValues.name);
      fd.append("street", formValues.street);
      fd.append("postalCode", formValues.postalCode);
      fd.append("city", formValues.city);
      fd.append("region", formValues.region);
      fd.append("country", formValues.country);

      fd.append("maxGuests", String(formValues.maxGuests));
      fd.append("bedrooms", String(formValues.bedrooms));
      fd.append("bathrooms", String(formValues.bathrooms));

      fd.append("shortDescription", formValues.shortDescription);
      fd.append("longDescription", formValues.longDescription);

      // Grille tarifaire (année)
      fd.append("pricingYear", String(formValues.pricingYear));
      fd.append("pricingDefaultNightlyPrice", String(formValues.pricingDefaultNightlyPrice));
      fd.append("pricingOverrides", JSON.stringify(pricingOverrides));
      fd.append("manualBlockedPeriods", JSON.stringify(manualBlockedPeriods));
      if (typeof formValues.availabilityIcalUrl === "string" && formValues.availabilityIcalUrl.trim()) {
        fd.append("availabilityIcalUrl", formValues.availabilityIcalUrl.trim());
      }

      // Ménage
      fd.append("cleaningIncluded", String(Boolean(formValues.cleaningIncluded)));
      if (typeof formValues.cleaningPrice === "number") {
        fd.append("cleaningPrice", String(formValues.cleaningPrice));
      }

      // Listes multi-lignes
      const quickHighlights = splitLines(formValues.quickHighlightsText || "");
      const keyAmenities = splitLines(formValues.keyAmenitiesText || "");
      fd.append("quickHighlights", JSON.stringify(quickHighlights));
      fd.append("keyAmenities", JSON.stringify(keyAmenities));

      // Environs
      if (formValues.surroundingsIntro) fd.append("surroundingsIntro", formValues.surroundingsIntro);
      if (formValues.environmentType) fd.append("environmentType", formValues.environmentType);
      if (formValues.distancesText) fd.append("distancesText", formValues.distancesText);

      // Info blocks
      const goodToKnow = splitLines(formValues.goodToKnowText || "");
      const conciergePoints = splitLines(formValues.conciergePointsText || "");
      const extraInfo = splitLines(formValues.extraInfoText || "");
      if (formValues.conciergeSubtitle) fd.append("conciergeSubtitle", formValues.conciergeSubtitle);
      fd.append("goodToKnow", JSON.stringify(goodToKnow));
      fd.append("conciergePoints", JSON.stringify(conciergePoints));
      fd.append("extraInfo", JSON.stringify(extraInfo));

      fd.append("heroIndex", String(heroIndex));
      picked.forEach((p) => fd.append("images", p.file));

      const res = await fetch("/api/owner/onboarding", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json().catch(() => ({}))) as OnboardingResult;

      if (!res.ok) {
        setServerError(data.error ?? "Erreur lors de la création.");
        return;
      }

      setResult(data);
    } catch {
      setServerError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  });

  const pricingYear =
    typeof v.pricingYear === "number" && Number.isFinite(v.pricingYear)
      ? Math.trunc(v.pricingYear)
      : new Date().getFullYear();
  const pricingDefaultNightlyPrice =
    typeof v.pricingDefaultNightlyPrice === "number" && Number.isFinite(v.pricingDefaultNightlyPrice)
      ? Math.trunc(v.pricingDefaultNightlyPrice)
      : 0;

  const pricingOverrideMatchers = pricingOverrides
    .map((o) => {
      const from = startOfDay(parseISO(String(o?.from || "")));
      const to = startOfDay(parseISO(String(o?.to || "")));
      if (!isValid(from) || !isValid(to)) return null;
      return { from, to };
    })
    .filter((x): x is { from: Date; to: Date } => !!x);

  const manualBlockedMatchers = manualBlockedPeriods
    .map((p) => {
      const from = startOfDay(parseISO(String(p?.from || "")));
      const to = startOfDay(parseISO(String(p?.to || "")));
      if (!isValid(from) || !isValid(to)) return null;
      return { from, to };
    })
    .filter((x): x is { from: Date; to: Date } => !!x);

  const icalBlockedMatchers = icalBlockedRanges
    .map((r) => {
      const from = startOfDay(parseISO(String(r?.from || "")));
      const to = startOfDay(parseISO(String(r?.to || "")));
      if (!isValid(from) || !isValid(to)) return null;
      return { from, to };
    })
    .filter((x): x is { from: Date; to: Date } => !!x);

  const icalBlockedInYear = (() => {
    if (!icalBlockedMatchers.length) return [];
    const yearStart = startOfDay(new Date(pricingYear, 0, 1));
    const yearEnd = startOfDay(new Date(pricingYear, 11, 31));
    return icalBlockedMatchers
      .filter((r) => !(r.to < yearStart || r.from > yearEnd))
      .sort((a, b) => a.from.getTime() - b.from.getTime());
  })();

  const nextIcalRangeInYear = icalBlockedInYear[0] ?? null;

  const pricingSelectionMatcher = pricingSelection
    ? { from: pricingSelection.from, to: pricingSelection.to }
    : undefined;

  function PricingDayButton(props: DayButtonProps) {
    const { day, modifiers, className, children, ...buttonProps } = props;
    const ymd = toYmd(day.date);
    const price = getNightlyPriceForDay(ymd, pricingDefaultNightlyPrice, pricingOverrides);
    const isOverride = Boolean(modifiers?.override);
    const isIcalBlocked = Boolean(modifiers?.blockedIcal);
    const isManualBlocked = Boolean(modifiers?.blockedManual);
    const isSelected = Boolean(modifiers?.selection);
    const isToday = Boolean(modifiers?.today);
    const tone = isIcalBlocked ? "ical" : isManualBlocked ? "manual" : isOverride ? "override" : "default";
    return (
      <button
        {...buttonProps}
        className={[
          className || "",
          "flex h-10 w-10 flex-col items-center justify-center rounded-xl text-[11px] leading-none transition",
          tone === "ical"
            ? "bg-red-200 text-red-950 hover:bg-red-200"
            : tone === "manual"
              ? "bg-rose-200 text-rose-950 hover:bg-rose-200"
              : tone === "override"
                ? "bg-amber-100 text-amber-950 hover:bg-amber-100"
                : "bg-white text-slate-900 hover:bg-slate-50",
          isSelected
            ? "ring-2 ring-slate-900"
            : tone === "ical"
              ? "ring-1 ring-red-300"
              : tone === "manual"
                ? "ring-1 ring-rose-300"
                : "ring-1 ring-slate-200",
          isToday ? "shadow-[0_0_0_2px_#bd9254]" : "",
        ].join(" ")}
      >
        <span className="font-semibold">{children}</span>
        <span
          className={[
            "mt-0.5 text-[9px] font-medium",
            tone === "ical"
              ? "text-red-900"
              : tone === "manual"
                ? "text-rose-900"
                : tone === "override"
                  ? "text-amber-900"
                  : "text-slate-500",
          ].join(" ")}
        >
          {price}€
        </span>
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* FORM */}
        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Onboarding propriétaire
              </h1>
              <p className="mt-1 text-sm text-slate-600">Étape {step}/2</p>
            </div>
          </div>

          <form className="mt-6 space-y-8" onSubmit={onSubmit}>
            {/* STEP 1 */}
            {step === 1 ? (
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Étape 1 — Propriétaire
                </p>

                <Field label="Nom du propriétaire" error={errors.ownerName?.message}>
                  <Input placeholder="Jean Dupont" {...register("ownerName")} />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Email" error={errors.ownerEmail?.message}>
                    <Input placeholder="email@domaine.com" {...register("ownerEmail")} />
                  </Field>
                  <Field label="Téléphone" error={errors.ownerPhone?.message}>
                    <Input placeholder="+33…" {...register("ownerPhone")} />
                  </Field>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 2 */}
            {step === 2 ? (
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Étape 2 — Villa
                </p>

                <Field label="Nom du bien" error={errors.name?.message}>
                  <Input placeholder="Chalet des Airelles" {...register("name")} />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Région / zone" error={errors.region?.message}>
                    <Input placeholder="Haute Savoie" {...register("region")} />
                  </Field>
                  <Field label="Pays" error={errors.country?.message}>
                    <Input placeholder="France" {...register("country")} />
                  </Field>
                </div>

                {/* Adresse complète */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Numéro et rue" error={errors.street?.message}>
                    <Input placeholder="12 rue des Airelles" {...register("street")} />
                  </Field>
                  <Field label="Code postal" error={errors.postalCode?.message}>
                    <Input placeholder="74400" {...register("postalCode")} />
                  </Field>
                  <Field label="Ville" error={errors.city?.message}>
                    <Input placeholder="Chamonix" {...register("city")} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Voyageurs max" error={errors.maxGuests?.message}>
                    <Input
                      type="number"
                      min={1}
                      {...register("maxGuests", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Chambres" error={errors.bedrooms?.message}>
                    <Input
                      type="number"
                      min={1}
                      {...register("bedrooms", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Salles de bain" error={errors.bathrooms?.message}>
                    <Input
                      type="number"
                      min={1}
                      {...register("bathrooms", { valueAsNumber: true })}
                    />
                  </Field>
                </div>

                {/* Grille tarifaire + ménage */}
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Grille tarifaire (année civile)
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Définis un prix par défaut puis ajuste des périodes (jour / semaine / mois).
                      </p>
                    </div>

                    {pricingStats ? (
                      <p className="text-xs text-slate-600">
                        Min{" "}
                        <span className="font-semibold text-slate-900">
                          {pricingStats.min.toLocaleString("fr-FR")} €
                        </span>
                        {typeof pricingStats.max === "number" ? (
                          <>
                            {" "}
                            • Max{" "}
                            <span className="font-semibold text-slate-900">
                              {pricingStats.max.toLocaleString("fr-FR")} €
                            </span>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Field label="Année" error={errors.pricingYear?.message}>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        {...register("pricingYear", { valueAsNumber: true })}
                      />
                    </Field>
                    <Field
                      label="Prix par défaut / nuit (EUR)"
                      error={errors.pricingDefaultNightlyPrice?.message}
                    >
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...register("pricingDefaultNightlyPrice", { valueAsNumber: true })}
                      />
                    </Field>
                    <Field label="Ménage inclus ?" error={errors.cleaningIncluded?.message as string}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 align-middle"
                        {...register("cleaningIncluded")}
                      />
                    </Field>
                    <Field label="Prix ménage (EUR)" error={errors.cleaningPrice?.message}>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...register("cleaningPrice", { valueAsNumber: true })}
                      />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Lien iCal (optionnel)" error={errors.availabilityIcalUrl?.message}>
                      <Input
                        type="url"
                        placeholder="https://calendar.avantio.pro/... .ics"
                        {...register("availabilityIcalUrl")}
                      />
                    </Field>
                    {typeof v.availabilityIcalUrl === "string" && v.availabilityIcalUrl.trim() ? (
                      <p className={["mt-2 text-xs", icalBlockedError ? "text-red-600" : "text-slate-500"].join(" ")}>
                        {icalBlockedLoading
                          ? "Chargement des indisponibilités iCal…"
                          : icalBlockedError
                            ? icalBlockedError
                            : icalBlockedInYear.length
                              ? `${icalBlockedRanges.length} période(s) indisponible(s) détectée(s) via iCal (${icalBlockedInYear.length} sur ${pricingYear}).`
                              : `${icalBlockedRanges.length} période(s) indisponible(s) détectée(s) via iCal (aucune sur ${pricingYear}).`}
                      </p>
                    ) : null}
                    {typeof v.availabilityIcalUrl === "string" &&
                    v.availabilityIcalUrl.trim() &&
                    !icalBlockedLoading &&
                    !icalBlockedError &&
                    nextIcalRangeInYear ? (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">
                          Prochaine indisponibilité: {toYmd(nextIcalRangeInYear.from)} → {toYmd(nextIcalRangeInYear.to)}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            pricingMonthTouchedRef.current = true;
                            setPricingMonth(startOfMonth(nextIcalRangeInYear.from));
                          }}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Afficher sur le calendrier →
                        </button>
                      </div>
                    ) : null}
                  </div>

		                  <div className="mt-4 grid gap-4 grid-cols-1">
		                    <div className="overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-slate-200">
		                      <DayPicker
		                        locale={fr}
	                        weekStartsOn={1}
                        showOutsideDays={false}
                        month={pricingMonth}
                        onMonthChange={(m) => {
                          pricingMonthTouchedRef.current = true;
                          setPricingMonth(m);
                        }}
                        startMonth={new Date(pricingYear, 0, 1)}
                        endMonth={new Date(pricingYear, 11, 1)}
                        modifiers={{
                          override: pricingOverrideMatchers,
                          blockedIcal: icalBlockedMatchers,
                          blockedManual: manualBlockedMatchers,
                          ...(pricingSelectionMatcher ? { selection: pricingSelectionMatcher } : {}),
                        }}
                        components={{ DayButton: PricingDayButton }}
                        onDayClick={(day, _modifiers, e) => {
                          const base = startOfDay(day);
                          const yearStart = startOfDay(new Date(pricingYear, 0, 1));
                          const yearEnd = startOfDay(new Date(pricingYear, 11, 31));

                          const hasShift = e.shiftKey;
                          const anchor = pricingAnchor;

                          // Shift + clic: étend la sélection depuis l'ancre
                          if (hasShift && anchor) {
                            const start = anchor < base ? anchor : base;
                            const end = anchor < base ? base : anchor;

                            let from = start;
                            let to = end;

                            if (pricingMode === "week") {
                              from = startOfWeek(start, { weekStartsOn: 1 });
                              to = endOfWeek(end, { weekStartsOn: 1 });
                            } else if (pricingMode === "month") {
                              from = startOfMonth(start);
                              to = endOfMonth(end);
                            }

                            if (from < yearStart) from = yearStart;
                            if (to > yearEnd) to = yearEnd;

                            setPricingSelection({ from, to });
                            return;
                          }

                          // Clic simple: sélection "bloc" selon le mode et définit l'ancre
                          let from = base;
                          let to = base;

                          if (pricingMode === "week") {
                            from = startOfWeek(base, { weekStartsOn: 1 });
                            to = endOfWeek(base, { weekStartsOn: 1 });
                          } else if (pricingMode === "month") {
                            from = startOfMonth(base);
                            to = endOfMonth(base);
                          }

                          if (from < yearStart) from = yearStart;
                          if (to > yearEnd) to = yearEnd;

                          setPricingAnchor(base);
                          setPricingSelection({ from, to });
                        }}
                        classNames={{
                          month: "w-full",
                          month_caption: "mb-2 flex items-center justify-between px-1",
                          caption_label: "text-sm font-semibold text-slate-900",
                          nav: "flex items-center gap-1",
                          button_previous:
                            "grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50",
                          button_next:
                            "grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50",
                          month_grid: "w-full border-collapse",
                          weekday:
                            "py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500",
	                          day: "p-0.5",
	                          day_button: "focus:outline-none",
	                        }}
	                      />

	                      <div className="mt-3 border-t border-slate-100 px-1 pb-1 pt-3">
	                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
	                          Mode de sélection
	                        </p>
		                        <div className="mt-2 flex flex-wrap gap-2">
		                          {([
		                            ["day", "Jour"],
		                            ["week", "Semaine"],
		                            ["month", "Mois"],
	                          ] as const).map(([key, label]) => (
	                            <button
	                              key={key}
	                              type="button"
	                              onClick={() => setPricingMode(key)}
	                              className={[
	                                "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition",
	                                pricingMode === key
	                                  ? "bg-slate-900 text-white ring-slate-900"
	                                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
	                              ].join(" ")}
	                            >
	                              {label}
		                            </button>
		                          ))}
		                        </div>

		                        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-600">
		                          {icalBlockedMatchers.length ? (
		                            <span className="inline-flex items-center gap-2">
		                              <span className="h-3 w-3 rounded-sm bg-red-200 ring-1 ring-red-300" />
		                              <span>iCal</span>
		                            </span>
		                          ) : null}
		                          {manualBlockedPeriods.length ? (
		                            <span className="inline-flex items-center gap-2">
		                              <span className="h-3 w-3 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
		                              <span>Bloqué (manuel)</span>
		                            </span>
		                          ) : null}
		                          {pricingOverrides.length ? (
		                            <span className="inline-flex items-center gap-2">
		                              <span className="h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-200" />
		                              <span>Prix personnalisé</span>
		                            </span>
		                          ) : null}
		                        </div>
		                      </div>
		                    </div>

	                    <div className="space-y-3">
	                      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
	                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
	                          Sélection
	                        </p>
	                        {pricingSelection ? (
	                          <div className="mt-1 flex items-baseline justify-between gap-3">
	                            <p className="text-sm font-medium text-slate-900">
	                              {toYmd(pricingSelection.from)} → {toYmd(pricingSelection.to)}
	                            </p>
	                            {pricingApplyLabel.trim() ? (
	                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
	                                {pricingApplyLabel.trim()}
	                              </p>
	                            ) : null}
	                          </div>
	                        ) : (
	                          <p className="mt-1 text-sm text-slate-600">Clique sur une date.</p>
	                        )}

	                        <div className="mt-3 grid gap-2">
	                          <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
	                            Nom de période (optionnel)
	                          </label>
	                          <input
	                            type="text"
	                            maxLength={80}
	                            value={pricingApplyLabel}
	                            onChange={(e) => setPricingApplyLabel(e.target.value)}
	                            placeholder="Ex: Prix Noël"
	                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
	                          />
	                        </div>

	                        <div className="mt-3 grid gap-2">
	                          <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
	                            Prix (€/nuit)
	                          </label>
	                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={Number.isFinite(pricingApplyPrice) ? pricingApplyPrice : ""}
                            onChange={(e) => setPricingApplyPrice(Number(e.target.value))}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                          />
                        </div>

	                        <div className="mt-3 flex flex-wrap gap-2">
	                          <button
	                            type="button"
	                            disabled={
                              !pricingSelection ||
                              !Number.isFinite(pricingApplyPrice) ||
                              !Number.isInteger(pricingApplyPrice) ||
                              pricingApplyPrice < 0 ||
                              !Number.isFinite(pricingDefaultNightlyPrice) ||
                              !Number.isInteger(pricingDefaultNightlyPrice)
                            }
                            onClick={() => {
                              if (!pricingSelection) return;
                              if (!Number.isFinite(pricingApplyPrice) || !Number.isInteger(pricingApplyPrice))
                                return;

	                              const next = normalizePricingOverrides(pricingYear, pricingDefaultNightlyPrice, [
	                                ...pricingOverrides,
	                                {
	                                  from: toYmd(pricingSelection.from),
	                                  to: toYmd(pricingSelection.to),
	                                  nightlyPrice: pricingApplyPrice,
	                                  label: pricingApplyLabel.trim() || undefined,
	                                },
	                              ]);
	                              setPricingOverrides(next);
	                            }}
	                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
	                          >
                            Appliquer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPricingSelection(null);
                              setPricingAnchor(null);
                              setPricingApplyLabel("");
                            }}
                            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                          >
	                            Effacer sélection
	                          </button>
	                        </div>

                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Bloquer ces dates (manuel)
                            </p>

                            <div className="mt-2 grid gap-2">
                              <label className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                                Commentaire
                              </label>
                              <input
                                type="text"
                                maxLength={120}
                                value={blockComment}
                                onChange={(e) => {
                                  setBlockComment(e.target.value);
                                  if (blockError) setBlockError("");
                                }}
                                placeholder="Ex: Maintenance, privatisation…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                              />
                            </div>

                            {blockError ? <p className="mt-2 text-xs text-red-600">{blockError}</p> : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  !pricingSelection ||
                                  !blockComment.trim() ||
                                  (typeof v.availabilityIcalUrl === "string" &&
                                    v.availabilityIcalUrl.trim().length > 0 &&
                                    icalBlockedLoading)
                                }
                                onClick={() => {
                                  setBlockError("");
                                  if (!pricingSelection) return;
                                  const comment = blockComment.trim();
                                  if (!comment) {
                                    setBlockError("Commentaire requis pour bloquer.");
                                    return;
                                  }

                                  if (
                                    icalBlockedMatchers.length > 0 &&
                                    icalBlockedMatchers.some((r) => rangesOverlap(pricingSelection, r))
                                  ) {
                                    setBlockError("Impossible: la sélection chevauche des dates iCal (rouge).");
                                    return;
                                  }

                                  const next = normalizeManualBlockedPeriods(pricingYear, [
                                    ...manualBlockedPeriods,
                                    {
                                      from: toYmd(pricingSelection.from),
                                      to: toYmd(pricingSelection.to),
                                      comment,
                                    },
                                  ]);
                                  setManualBlockedPeriods(next);
                                }}
                                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Bloquer
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockComment("");
                                  setBlockError("");
                                }}
                                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                              >
                                Effacer commentaire
                              </button>
                            </div>
                          </div>
	                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Périodes personnalisées
                          </p>
                          {pricingOverrides.length ? (
                            <button
                              type="button"
                              onClick={() => setPricingOverrides([])}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Tout effacer
                            </button>
                          ) : null}
                        </div>

                        {pricingOverrides.length ? (
	                          <ul className="space-y-2">
	                            {pricingOverrides.map((o, idx) => (
	                              <li
	                                key={`${o.from}-${o.to}-${o.nightlyPrice}-${o.label ?? ""}-${idx}`}
	                                className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200"
	                              >
	                                <div className="min-w-0 flex-1">
	                                  <div className="flex items-baseline justify-between gap-3">
	                                    <p className="truncate text-xs font-semibold text-slate-900">
	                                      {o.from} → {o.to}
	                                    </p>
	                                    {o.label ? (
	                                      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
	                                        {o.label}
	                                      </p>
	                                    ) : null}
	                                  </div>
	                                  <p className="text-xs text-slate-600">
	                                    {o.nightlyPrice.toLocaleString("fr-FR")} € / nuit
	                                  </p>
	                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPricingOverrides((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                  Supprimer
                                </button>
                              </li>
                            ))}
                          </ul>
	                        ) : (
	                          <p className="text-sm text-slate-600">
	                            Aucune période personnalisée pour l’instant.
	                          </p>
	                        )}
	                      </div>

	                      <div className="space-y-2">
	                        <div className="flex items-center justify-between gap-3">
	                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
	                            Dates bloquées (manuel)
	                          </p>
	                          {manualBlockedPeriods.length ? (
	                            <button
	                              type="button"
	                              onClick={() => setManualBlockedPeriods([])}
	                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
	                            >
	                              Tout effacer
	                            </button>
	                          ) : null}
	                        </div>

	                        {manualBlockedPeriods.length ? (
	                          <ul className="space-y-2">
	                            {manualBlockedPeriods.map((p, idx) => (
	                              <li
	                                key={`${p.from}-${p.to}-${p.comment}-${idx}`}
	                                className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200"
	                              >
	                                <div className="min-w-0 flex-1">
	                                  <div className="flex items-baseline justify-between gap-3">
	                                    <p className="truncate text-xs font-semibold text-slate-900">
	                                      {p.from} → {p.to}
	                                    </p>
	                                    <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
	                                      Bloqué
	                                    </p>
	                                  </div>
	                                  <p className="text-xs text-slate-600">{p.comment}</p>
	                                </div>
	                                <button
	                                  type="button"
	                                  onClick={() =>
	                                    setManualBlockedPeriods((prev) => prev.filter((_, i) => i !== idx))
	                                  }
	                                  className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
	                                >
	                                  Supprimer
	                                </button>
	                              </li>
	                            ))}
	                          </ul>
	                        ) : (
	                          <p className="text-sm text-slate-600">Aucune date bloquée pour l’instant.</p>
	                        )}
	                      </div>
	                    </div>
	                  </div>
	                </div>

                <Field label="Description courte" error={errors.shortDescription?.message}>
                  <Textarea rows={3} placeholder="2–3 phrases…" {...register("shortDescription")} />
                </Field>

                <Field label="Description longue" error={errors.longDescription?.message}>
                  <Textarea rows={7} placeholder="Texte complet…" {...register("longDescription")} />
                </Field>

                {/* Incontournables & Équipements (amenities) */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Incontournables (ajoute ou coche)">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedQuickHighlights.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              onChange={(e) => {
                                const current = splitLines(v.quickHighlightsText || "");
                                if (e.target.checked) {
                                  if (!current.includes(item)) setValue("quickHighlightsText", [...current, item].join("\n"));
                                } else {
                                  setValue(
                                    "quickHighlightsText",
                                    current.filter((x) => x !== item).join("\n")
                                  );
                                }
                              }}
                              checked={splitLines(v.quickHighlightsText || "").includes(item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                      <Textarea
                        rows={4}
                        placeholder="Ajoute tes incontournables (1 par ligne)"
                        {...register("quickHighlightsText")}
                      />
                      <p className="text-[11px] text-slate-500">Combine la sélection ci-dessus et tes propres idées.</p>
                    </div>
                  </Field>

                  <Field label="Équipements / amenities (coche + ajoute)">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedAmenities.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              onChange={(e) => {
                                const current = splitLines(v.keyAmenitiesText || "");
                                if (e.target.checked) {
                                  if (!current.includes(item)) setValue("keyAmenitiesText", [...current, item].join("\n"));
                                } else {
                                  setValue(
                                    "keyAmenitiesText",
                                    current.filter((x) => x !== item).join("\n")
                                  );
                                }
                              }}
                              checked={splitLines(v.keyAmenitiesText || "").includes(item)}
                            />
                            <span className="inline-flex items-center gap-1">
                              {item === "Sauna" && <Flame className="h-3 w-3 text-amber-600" />}
                              {item === "Piscine chauffée" && <Waves className="h-3 w-3 text-cyan-600" />}
                              {item === "Salle de sport" && <Dumbbell className="h-3 w-3 text-slate-700" />}
                              {item === "Climatisation" && <Wind className="h-3 w-3 text-sky-600" />}
                              {item === "Wi-Fi haut débit" && <Wifi className="h-3 w-3 text-emerald-600" />}
                              {item === "Parking privé" && <Car className="h-3 w-3 text-slate-700" />}
                              <span>{item}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <Textarea
                        rows={4}
                        placeholder="Ajoute tes équipements (1 par ligne)"
                        {...register("keyAmenitiesText")}
                      />
                      <p className="text-[11px] text-slate-500">
                        {"Ajoute ce qui n'est pas dans la liste ou supprime ce qui ne s'applique pas."}
                      </p>
                    </div>
                  </Field>
                </div>

                {/* Alentours */}
                <div className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">Les alentours</p>
                  </div>
                  <Field label="Accroche / introduction">
                    <Textarea rows={3} placeholder="Présente le quartier, l'accès aux pistes, les commerces..." {...register("surroundingsIntro")} />
                  </Field>
                  <Field label="Type d'environnement">
                    <Input placeholder="Village authentique, au bord du lac, au pied des pistes..." {...register("environmentType")} />
                  </Field>
                  <Field label="Distances (coche + ajoute)">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {["Pistes | 10 min | walk", "Supermarché | 5 min | car", "Port | 15 min | boat", "Gare | 20 min | car"].map((d) => (
                          <label key={d} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              onChange={(e) => {
                                const current = splitLines(v.distancesText || "");
                                if (e.target.checked) {
                                  if (!current.includes(d)) setValue("distancesText", [...current, d].join("\n"));
                                } else {
                                  setValue(
                                    "distancesText",
                                    current.filter((x) => x !== d).join("\n")
                                  );
                                }
                              }}
                              checked={splitLines(v.distancesText || "").includes(d)}
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                      <Textarea
                        rows={3}
                        placeholder="Ajoute tes distances (1 par ligne: libellé | durée | car/walk/boat)"
                        {...register("distancesText")}
                      />
                      <p className="text-[11px] text-slate-500">
                        {"Format: Lieu | durée | moyen (car / walk / boat). Ex: “Plage | 8 min | walk”."}
                      </p>
                    </div>
                  </Field>
                </div>

                {/* Blocs d'info */}
                <div className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-medium text-slate-800">Informations & conciergerie</p>
                  <Field label="Bon à savoir (coche + ajoute)">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedGoodToKnow.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              onChange={(e) => {
                                const current = splitLines(v.goodToKnowText || "");
                                if (e.target.checked) {
                                  if (!current.includes(item)) setValue("goodToKnowText", [...current, item].join("\n"));
                                } else {
                                  setValue(
                                    "goodToKnowText",
                                    current.filter((x) => x !== item).join("\n")
                                  );
                                }
                              }}
                              checked={splitLines(v.goodToKnowText || "").includes(item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                      <Textarea rows={3} placeholder="Ajoute tes infos (1 par ligne)" {...register("goodToKnowText")} />
                    </div>
                  </Field>
                  <Field label="Sous-titre conciergerie">
                    <Input placeholder="Nos équipes organisent vos activités…" {...register("conciergeSubtitle")} />
                  </Field>
                  <Field label="Points conciergerie (coche + ajoute)">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedConcierge.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              onChange={(e) => {
                                const current = splitLines(v.conciergePointsText || "");
                                if (e.target.checked) {
                                  if (!current.includes(item)) setValue("conciergePointsText", [...current, item].join("\n"));
                                } else {
                                  setValue(
                                    "conciergePointsText",
                                    current.filter((x) => x !== item).join("\n")
                                  );
                                }
                              }}
                              checked={splitLines(v.conciergePointsText || "").includes(item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                      <Textarea rows={3} placeholder="Ajoute tes points conciergerie (1 par ligne)" {...register("conciergePointsText")} />
                    </div>
                  </Field>
                  <Field label="Informations supplémentaires (ajoute)">
                    <Textarea rows={3} placeholder="Animaux sur demande\nAccessible PMR (partiellement)" {...register("extraInfoText")} />
                  </Field>
                </div>

                {/* DROPZONE */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Photos (max 20) + sélectionner la hero
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onFilePick}
                    className="hidden"
                  />

                  <div
                    onClick={openFilePicker}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOver(false);
                      if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
                    }}
                    className={[
                      "cursor-pointer rounded-3xl border-2 border-dashed p-6",
                      dragOver ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <p className="text-sm font-medium text-slate-900">
                      Glisser-déposer des images ici
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      ou cliquer pour sélectionner des fichiers
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {picked.length}/20 sélectionnées
                    </p>
                  </div>

                  {picked.length ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {picked.map((img, idx) => {
                        const isHero = idx === heroIndex;
                        return (
                          <div
                            key={`${img.name}-${img.size}-${idx}`}
                            className="overflow-hidden rounded-2xl ring-1 ring-slate-100"
                          >
                            <div className="relative aspect-4/3 bg-slate-50">
                              <Image
                                src={img.url}
                                alt={img.name}
                                fill
                                unoptimized
                                sizes="(min-width: 640px) 33vw, 100vw"
                                className="object-cover"
                              />

                              {isHero ? (
                                <div className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                                  Hero
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between gap-2 p-3">
                              <label className="flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="radio"
                                  name="hero"
                                  className="h-4 w-4 accent-slate-900"
                                  checked={isHero}
                                  onChange={() => toggleHero(idx)}
                                />
                                Hero
                              </label>

                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-200"
                  >
                    Retour
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submitting ? "Création…" : "Créer"}
                  </button>
                </div>

                {result ? (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                    <p className="text-sm font-medium text-emerald-900">Créé avec succès</p>
                    <div className="mt-3 space-y-2 text-sm text-emerald-900">
                      {result.publicUrl ? (
                        <p>
                          <span className="font-medium">Fiche publique :</span>{" "}
                          <a
                            className="underline"
                            href={result.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {result.publicUrl}
                          </a>
                        </p>
                      ) : null}
                      {result.ownerUrl ? (
                        <p>
                          <span className="font-medium">Espace owner :</span>{" "}
                          <a
                            className="underline"
                            href={result.ownerUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {result.ownerUrl}
                          </a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>
        </section>

        {/* ASIDE */}
        <aside className="h-fit rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-100 lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Aperçu
          </p>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Owner
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {nonEmpty(v.ownerName) ? v.ownerName : "—"}
            </p>
            {nonEmpty(v.ownerEmail) ? (
              <p className="mt-1 text-sm text-slate-700">{v.ownerEmail}</p>
            ) : null}
            {nonEmpty(v.ownerPhone) ? (
              <p className="mt-1 text-sm text-slate-700">{v.ownerPhone}</p>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Villa
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {nonEmpty(v.name) ? v.name : "—"}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {nonEmpty(v.region) ? v.region : "—"} · {nonEmpty(v.country) ? v.country : "—"}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {typeof v.maxGuests === "number" ? `${v.maxGuests} pers.` : "—"}
              {typeof v.bedrooms === "number" ? ` · ${v.bedrooms} ch.` : ""}
              {typeof v.bathrooms === "number" ? ` · ${v.bathrooms} sdb.` : ""}
            </p>

            {nonEmpty(v.shortDescription) ? (
              <p className="mt-3 text-sm text-slate-700">
                {clampText(v.shortDescription, 160)}
              </p>
            ) : null}

            {picked.length ? (
              <p className="mt-3 text-xs text-slate-600">
                Photos: {picked.length} · Hero #{heroIndex + 1}
              </p>
            ) : null}
          </div>

          {/* Aperçu prix */}
          {pricingStats ? (
            <p className="mt-3 text-sm text-slate-700">
              Prix dès {pricingStats.min.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € / nuit
              {typeof pricingStats.max === "number"
                ? ` · jusqu’à ${pricingStats.max.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`
                : ""}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
