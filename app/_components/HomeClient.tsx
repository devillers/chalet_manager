"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  ChevronRight,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type Audience = "owner" | "traveler";

type Villa = {
  id: string;
  title: string;
  location: string; // Megève, Chamonix...
  capacity: number;
  priceTier: "€€€" | "€€€€" | "€€€€€";
  image: string;
  alt: string;
  href: string;
  tags: string[];
};

const VILLAS: Villa[] = [
  {
    id: "megeve-1",
    title: "Chalet signature à Megève",
    location: "Megève",
    capacity: 10,
    priceTier: "€€€€",
    image: "/images/villas/megeve-1.jpg",
    alt: "Chalet de luxe à Megève avec vue montagne",
    href: "/villas/chalet-signature-megeve",
    tags: ["Sauna", "Vue", "Proche pistes"],
  },
  {
    id: "chamonix-1",
    title: "Villa panoramique à Chamonix",
    location: "Chamonix",
    capacity: 12,
    priceTier: "€€€€€",
    image: "/images/villas/chamonix-1.jpg",
    alt: "Villa de luxe à Chamonix avec panorama sur massif",
    href: "/villas/villa-panoramique-chamonix",
    tags: ["Concierge", "Cheminée", "Panorama"],
  },
  {
    id: "stgervais-1",
    title: "Chalet familial à Saint-Gervais",
    location: "Saint-Gervais",
    capacity: 8,
    priceTier: "€€€",
    image: "/images/villas/stgervais-1.jpg",
    alt: "Chalet familial haut de gamme à Saint-Gervais",
    href: "/villas/chalet-familial-saint-gervais",
    tags: ["Famille", "Calme", "Nature"],
  },
];

const TESTIMONIALS = [
  {
    name: "Family Office, Suisse",
    quote:
      "Exécution irréprochable, reporting clair, et une vraie culture de la discrétion. La gestion est devenue simple.",
  },
  {
    name: "Propriétaire, Megève",
    quote:
      "Qualité d’accueil et d’entretien au niveau de nos standards. Optimisation des périodes clés sans compromis.",
  },
  {
    name: "Voyageur premium",
    quote:
      "Une expérience fluide, du transfert aux services sur place. On se sent attendu, sans être sollicité.",
  },
];

const FAQ = [
  {
    q: "Quels services de conciergerie privée proposez-vous pour villas et chalets ?",
    a: "Accueil personnalisé, intendance, ménage premium, linge, maintenance, chauffeurs, chefs, expériences et demandes sur-mesure, avec un niveau de discrétion adapté aux family offices.",
  },
  {
    q: "Faites-vous aussi de la gestion locative haut de gamme en Haute-Savoie ?",
    a: "Oui. Nous couvrons la gestion saisonnière (distribution, prix, calendrier, check-in/out, suivi qualité) avec des process conçus pour protéger l’actif et maximiser la performance.",
  },
  {
    q: "Travaillez-vous à Megève et Chamonix ?",
    a: "Oui. Nos opérations sont orientées Alpes du Nord, avec une priorité Megève, Chamonix, Saint-Gervais et les communes voisines.",
  },
  {
    q: "Affichez-vous les tarifs de gestion sur la homepage ?",
    a: "Nous privilégions une approche sobre. Les modalités sont partagées après qualification, car elles dépendent du bien, des usages propriétaires et des objectifs (rendement, protection, expérience).",
  },
];

function classNames(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

export default function HomeClient() {
  const [audience, setAudience] = useState<Audience>("owner");

  // Filtres “catalogue”
  const [loc, setLoc] = useState<string>("Toutes");
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [tier, setTier] = useState<string>("Tous");

  const locations = useMemo(() => {
    const set = new Set(VILLAS.map((v) => v.location));
    return ["Toutes", ...Array.from(set)];
  }, []);

  const tiers = ["Tous", "€€€", "€€€€", "€€€€€"];

  const filtered = useMemo(() => {
    return VILLAS.filter((v) => {
      if (loc !== "Toutes" && v.location !== loc) return false;
      if (minCapacity > 0 && v.capacity < minCapacity) return false;
      if (tier !== "Tous" && v.priceTier !== tier) return false;
      return true;
    });
  }, [loc, minCapacity, tier]);

  const hero = useMemo(() => {
    if (audience === "owner") {
      return {
        kicker: "Gestion locative luxe et protection d’actif",
        h1: "Vos patrimoines immobiliers d’exception, gérés en excellence",
        sub:
          "Gestion saisonnière haut standing, conciergerie privée et process qualité pour family offices et propriétaires exigeants à Megève, Chamonix et Haute-Savoie.",
        primary: { label: "Demander un audit", href: "#owners" },
        secondary: { label: "Voir notre méthode", href: "#services" },
      };
    }
    return {
      kicker: "Voyages d’exception dans les Alpes",
      h1: "Villas et chalets de prestige, avec conciergerie privée",
      sub:
        "Séjours premium à Megève, Chamonix et alentours. Sélection exigeante, accueil personnalisé et services sur-mesure.",
      primary: { label: "Découvrir nos villas", href: "#villas" },
      secondary: { label: "Demander un service", href: "#travelers" },
    };
  }, [audience]);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-neutral-200">
              <Image src="/logo-mark.png" alt="Care Concierge Luxury" fill className="object-cover" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Care Concierge Luxury</div>
              <div className="text-xs text-neutral-600">Family offices, villas, conciergerie</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#villas" className="text-neutral-700 hover:text-neutral-950">
              Villas
            </a>
            <a href="#services" className="text-neutral-700 hover:text-neutral-950">
              Services
            </a>
            <a href="#proof" className="text-neutral-700 hover:text-neutral-950">
              Références
            </a>
            <a href="#faq" className="text-neutral-700 hover:text-neutral-950">
              FAQ
            </a>
            <Link href="/blog" className="text-neutral-700 hover:text-neutral-950">
              Blog
            </Link>
          </nav>

          {/* Toggle audience */}
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setAudience("owner")}
              className={classNames(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                audience === "owner" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              )}
              aria-pressed={audience === "owner"}
            >
              Propriétaire
            </button>
            <button
              type="button"
              onClick={() => setAudience("traveler")}
              className={classNames(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                audience === "traveler" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              )}
              aria-pressed={audience === "traveler"}
            >
              Voyageur
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero.jpg"
            alt="Villa de luxe dans les Alpes"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-white" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 md:px-6 md:pb-20 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{hero.kicker}</span>
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {hero.h1}
            </h1>

            <p className="mt-5 max-w-2xl text-pretty text-base text-white/90 md:text-lg">
              {hero.sub}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={hero.primary.href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition hover:shadow"
              >
                {hero.primary.label} <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={hero.secondary.href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {hero.secondary.label}
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              <TrustChip icon={ShieldCheck} label="Process qualité" />
              <TrustChip icon={BadgeCheck} label="Standards premium" />
              <TrustChip icon={Handshake} label="Discrétion" />
              <TrustChip icon={Building2} label="Approche family office" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES (SEO H2) */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Conciergerie haut de gamme et gestion locative professionnelle
          </h2>
          <p className="mt-3 text-neutral-600">
            Un socle opérationnel conçu pour protéger l’actif, sécuriser l’exécution et délivrer une expérience cohérente,
            sans lourdeur.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ServiceCard
            icon={Building2}
            title="Gestion locative luxe"
            desc="Distribution, pricing, calendrier, reporting, pilotage qualité."
          />
          <ServiceCard
            icon={Users}
            title="Conciergerie privée"
            desc="Accueil, intendance, housekeeping premium, coordination sur place."
          />
          <ServiceCard
            icon={CalendarCheck}
            title="Expériences sur-mesure"
            desc="Chefs, transferts, guides, événements privés, bien-être."
          />
          <ServiceCard
            icon={ShieldCheck}
            title="Garanties et contrôle"
            desc="Checklists, audits, prestataires qualifiés, traçabilité."
          />
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section id="proof" className="border-y border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Crédibilité opérationnelle, discrétion, résultats
              </h2>
              <p className="mt-3 text-neutral-600">
                Présentez ici vos chiffres réels, certifications et références. Évitez le bruit, montrez des preuves.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KpiCard label="Propriétés gérées" value="À renseigner" />
                <KpiCard label="Satisfaction" value="À renseigner" />
                <KpiCard label="Années d’expérience" value="À renseigner" />
              </div>
            </div>

            <div className="grid gap-3">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
                >
                  <div className="text-sm font-semibold">{t.name}</div>
                  <p className="mt-2 text-sm text-neutral-700">{t.quote}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATALOGUE VILLAS */}
      <section id="villas" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Location saisonnière haut standing, sélection par destination
            </h2>
            <p className="mt-3 text-neutral-600">
              Megève, Chamonix, Haute-Savoie. Filtres simples pour la découverte, sans friction.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 md:w-auto">
            <div>
              <label className="text-xs font-medium text-neutral-700">Région</label>
              <select
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
              >
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Capacité minimum</label>
              <input
                type="number"
                min={0}
                value={minCapacity}
                onChange={(e) => setMinCapacity(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                placeholder="Ex: 8"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700">Budget</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
              >
                {tiers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Link
              key={v.id}
              href={v.href}
              className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:shadow"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={v.image}
                  alt={v.alt}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>{v.location}</span>
                    <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 ring-1 ring-white/20">
                      {v.priceTier}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">{v.title}</div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-sm text-neutral-700">
                  <span>{v.capacity} voyageurs</span>
                  <span className="text-neutral-500">Sélection premium</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {v.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  Voir la villa <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SERVICES DÉTAILLÉS (Tabs simples) */}
      <section className="border-y border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Une offre lisible, sans surcharge</h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Renforcez le champ sémantique (gestion locative haut de gamme, conciergerie privée, location saisonnière)
            via du contenu structuré et concis.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <DetailCard
              title="Conciergerie haut de gamme"
              items={[
                "Accueil personnalisé, coordination des arrivées",
                "Housekeeping premium et linge",
                "Maintenance préventive et interventions",
                "Services sur-mesure et expériences",
              ]}
            />
            <DetailCard
              title="Gestion locative luxe"
              items={[
                "Stratégie prix et optimisation saisonnière",
                "Distribution et calendrier",
                "Contrôle qualité, audits, reporting",
                "Protection de l’actif et process opérationnels",
              ]}
            />
            <DetailCard
              title="Voyages d’exception"
              items={[
                "Sélection de biens haut standing",
                "Itinéraires, chefs, chauffeurs, guides",
                "Événements privés et lifestyle",
                "Discrétion adaptée aux family offices",
              ]}
            />
          </div>
        </div>
      </section>

      {/* FAQ + Blog anchors */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">FAQ et signaux de confiance</h2>
            <p className="mt-3 text-neutral-600">
              Les questions servent le SEO long-tail et réduisent la friction. Liez vers des articles (fiscalité, process,
              destinations).
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/blog/gestion-locative-luxe-megeve"
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              >
                Guide gestion locative à Megève
              </Link>
              <Link
                href="/blog/conciergerie-privee-villas"
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              >
                Conciergerie privée : comment ça marche
              </Link>
              <Link
                href="/blog/location-saisonniere-haute-savoie"
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              >
                Location saisonnière Haute-Savoie
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                    {f.q}
                  </span>
                </summary>
                <p className="mt-3 text-sm text-neutral-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FORMS SEGMENTÉS */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-2">
          {/* Owners */}
          <div id="owners" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Propriétaires, family offices</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Audit et cadrage. Objectifs, usages propriétaires, standards qualité, modèle de gestion.
            </p>

            <form className="mt-6 grid gap-3" action="/api/leads/owner" method="post">
              <Field label="Nom" name="name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Localisation du bien" name="location" placeholder="Megève, Chamonix..." />
              <Field label="Message" name="message" isTextArea placeholder="Objectif, contraintes, calendrier..." />
              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Demander un audit <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="text-xs text-neutral-500">
                Réponse sous 24 à 48h ouvrées. Discrétion. Pas d’envoi automatique de brochure.
              </p>
            </form>
          </div>

          {/* Travelers */}
          <div id="travelers" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Voyageurs premium</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Accès prioritaire aux disponibilités, conciergerie et demandes spécifiques.
            </p>

            <form className="mt-6 grid gap-3" action="/api/leads/traveler" method="post">
              <Field label="Nom" name="name" />
              <Field label="Email" name="email" type="email" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Destination" name="destination" placeholder="Megève, Chamonix..." />
                <Field label="Capacité" name="capacity" type="number" placeholder="Ex: 8" />
              </div>
              <Field label="Message" name="message" isTextArea placeholder="Dates, attentes, services..." />
              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Envoyer la demande <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="text-xs text-neutral-500">
                Nous répondons avec une sélection ciblée. Pas de spam, pas de diffusion de données.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-sm font-semibold">Care Concierge Luxury</div>
              <p className="mt-2 max-w-md text-sm text-neutral-600">
                Gestion locative haut de gamme et conciergerie privée pour villas et chalets d’exception à Megève,
                Chamonix et Haute-Savoie.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold">Navigation</div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700">
                <a href="#villas" className="hover:text-neutral-950">Villas</a>
                <a href="#services" className="hover:text-neutral-950">Services</a>
                <a href="#faq" className="hover:text-neutral-950">FAQ</a>
                <Link href="/blog" className="hover:text-neutral-950">Blog</Link>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">Légal</div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700">
                <Link href="/mentions-legales" className="hover:text-neutral-950">Mentions légales</Link>
                <Link href="/politique-de-confidentialite" className="hover:text-neutral-950">
                  Politique de confidentialité
                </Link>
                <Link href="/contact" className="hover:text-neutral-950">Contact</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200/70 pt-6 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Care Concierge Luxury</span>
            <span>Megève, Chamonix, Haute-Savoie</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function TrustChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20">
      <Icon className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  desc: string;
}) {
  return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="mt-4 text-base font-semibold">{title}</div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function DetailCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-base font-semibold">{title}</div>
      <ul className="mt-4 grid gap-2 text-sm text-neutral-700">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-900" aria-hidden="true" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  isTextArea,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  isTextArea?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      {isTextArea ? (
        <textarea
          name={name}
          rows={4}
          placeholder={placeholder}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      )}
    </label>
  );
}
