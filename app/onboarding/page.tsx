// app/onboarding/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

    // Prix & ménage
    priceMin: z.number().finite().min(0, "≥ 0"),
    priceMax: z.number().finite().min(0, "≥ 0").optional(),
    cleaningIncluded: z.boolean().default(false),
    cleaningPrice: z.number().finite().min(0, "≥ 0").optional(),

    // Descriptions
    shortDescription: z.string().min(10, "Description courte trop courte"),
    longDescription: z.string().min(50, "Description longue trop courte (≥ 50)"),

    // Environs
    surroundingsIntro: z.string().max(800, "Trop long").optional(),
    environmentType: z.string().max(200, "Trop long").optional(),
    distancesText: z.string().max(1200, "Trop long").optional(),

    // Textareas multi-lignes pour listes
    quickHighlightsText: z.string().max(800, "Trop long").optional(),
    keyAmenitiesText: z.string().max(1200, "Trop long").optional(),
    similarVillasText: z.string().max(800, "Trop long").optional(),

    // Blocs d'info
    goodToKnowText: z.string().max(1200, "Trop long").optional(),
    conciergeSubtitle: z.string().max(300, "Trop long").optional(),
    conciergePointsText: z.string().max(1200, "Trop long").optional(),
    extraInfoText: z.string().max(1200, "Trop long").optional(),

    // Témoignages (1 par ligne: nom | date | note | texte)
    testimonialsText: z.string().max(4000, "Trop long").optional(),
  })
  .superRefine((values, ctx) => {
    // Prix max ≥ prix min si présent
    if (typeof values.priceMax === "number" && values.priceMax < values.priceMin) {
      ctx.addIssue({ code: "custom", path: ["priceMax"], message: "Doit être ≥ prix min" });
    }
    // Si ménage = oui, prix ménage requis
    if (values.cleaningIncluded && typeof values.cleaningPrice !== "number") {
      ctx.addIssue({ code: "custom", path: ["cleaningPrice"], message: "Requis si ménage = oui" });
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "France",
      maxGuests: 1,
      bedrooms: 1,
      bathrooms: 1,
      cleaningIncluded: false,
    },
    mode: "onTouched",
  });

  const v = watch();

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

      // Prix & ménage
      fd.append("priceMin", String(formValues.priceMin));
      if (typeof formValues.priceMax === "number") {
        fd.append("priceMax", String(formValues.priceMax));
      }
      fd.append("cleaningIncluded", String(Boolean(formValues.cleaningIncluded)));
      if (typeof formValues.cleaningPrice === "number") {
        fd.append("cleaningPrice", String(formValues.cleaningPrice));
      }

      // Listes multi-lignes
      const quickHighlights = splitLines(formValues.quickHighlightsText || "");
      const keyAmenities = splitLines(formValues.keyAmenitiesText || "");
      const similarVillas = splitLines(formValues.similarVillasText || "");
      fd.append("quickHighlights", JSON.stringify(quickHighlights));
      fd.append("keyAmenities", JSON.stringify(keyAmenities));
      fd.append("similarVillas", JSON.stringify(similarVillas));

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

      // Témoignages (nom | date | note | texte)
      if (formValues.testimonialsText) {
        const testimonials = splitLines(formValues.testimonialsText)
          .map((line) => {
            const parts = line.split("|").map((s) => s.trim());
            if (parts.length < 4) return null;
            const [name, date, ratingStr, text] = parts;
            const rating = Number(ratingStr);
            return {
              name,
              date,
              text,
              rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : undefined,
            };
          })
          .filter((t) => t && t.name && t.text);
        fd.append("testimonials", JSON.stringify(testimonials));
      }

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

                {/* Prix & ménage */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Prix min / nuit (EUR)" error={errors.priceMin?.message}>
                    <Input type="number" min={0} step={1} {...register("priceMin", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Prix max / nuit (EUR)" error={errors.priceMax?.message}>
                    <Input type="number" min={0} step={1} {...register("priceMax", { valueAsNumber: true })} />
                  </Field>
                  <Field label="Ménage inclus ?" error={errors.cleaningIncluded?.message as string}>
                    <input type="checkbox" className="h-4 w-4 align-middle" {...register("cleaningIncluded")} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Prix ménage (EUR)" error={errors.cleaningPrice?.message}>
                    <Input type="number" min={0} step={1} {...register("cleaningPrice", { valueAsNumber: true })} />
                  </Field>
                </div>

                <Field label="Description courte" error={errors.shortDescription?.message}>
                  <Textarea rows={3} placeholder="2–3 phrases…" {...register("shortDescription")} />
                </Field>

                <Field label="Description longue" error={errors.longDescription?.message}>
                  <Textarea rows={7} placeholder="Texte complet…" {...register("longDescription")} />
                </Field>

                {/* Incontournables & Équipements (amenities) */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Incontournables (1 par ligne)">
                    <Textarea rows={4} placeholder="Vue lac\nCheminée\nSpa extérieur" {...register("quickHighlightsText")} />
                  </Field>
                  <Field label="Équipements / amenities (1 par ligne)">
                    <Textarea rows={4} placeholder="Piscine chauffée\nSauna\nSalle de sport" {...register("keyAmenitiesText")} />
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
                  <Field label="Distances (1 par ligne: libellé | durée | car/walk/boat)">
                    <Textarea rows={3} placeholder="Supermarché | 5 min | car\nPistes | 10 min | walk" {...register("distancesText")} />
                  </Field>
                </div>

                {/* Blocs d'info */}
                <div className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-medium text-slate-800">Informations & conciergerie</p>
                  <Field label="Bon à savoir (1 par ligne)">
                    <Textarea rows={3} placeholder="Caution demandée\nCheck-in 16h\nNon fumeur" {...register("goodToKnowText")} />
                  </Field>
                  <Field label="Sous-titre conciergerie">
                    <Input placeholder="Nos équipes organisent vos activités…" {...register("conciergeSubtitle")} />
                  </Field>
                  <Field label="Points conciergerie (1 par ligne)">
                    <Textarea rows={3} placeholder="Chef à domicile\nLocation de ski\nTransferts privés" {...register("conciergePointsText")} />
                  </Field>
                  <Field label="Informations supplémentaires (1 par ligne)">
                    <Textarea rows={3} placeholder="Animaux sur demande\nAccessible PMR (partiellement)" {...register("extraInfoText")} />
                  </Field>
                </div>

                {/* Témoignages */}
                <div className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-medium text-slate-800">Témoignages</p>
                  <Field label="1 par ligne: nom | date | note | texte">
                    <Textarea rows={4} placeholder="Alice | 2024-08 | 5 | Séjour parfait !\nMarc | 2024-02 | 4.5 | Excellent emplacement" {...register("testimonialsText")} />
                  </Field>
                </div>

                {/* Similar villas (slugs ou noms) */}
                <Field label="Similar villas (slugs ou noms, 1 par ligne)">
                  <Textarea rows={3} placeholder="chalet-aiglons\nchalet-bellevue" {...register("similarVillasText")} />
                </Field>

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
                            <div className="relative aspect-[4/3] bg-slate-50">
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
          {typeof v.priceMin === "number" ? (
            <p className="mt-3 text-sm text-slate-700">
              Prix dès {v.priceMin.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € / nuit
              {typeof v.priceMax === "number" ? ` · jusqu’à ${v.priceMax.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` : ""}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
