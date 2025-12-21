import Link from "next/link";
import { redirect } from "next/navigation";
import { groq } from "next-sanity";
import { FileText, House, MapPin, Menu, Search, Shield, Users } from "lucide-react";
import { auth } from "@/auth";
import { SignOutButton } from "@/app/_components/SignOutButton";
import { client as baseClient } from "@/sanity/lib/client";

export const revalidate = 0;

type TabKey = "villas" | "owners" | "posts" | "cities";

type VillaRow = {
  _id: string;
  _updatedAt?: string;
  name?: string;
  slug?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  region?: string;
  country?: string;
  customDomain?: string;
  priceMin?: number;
  priceMax?: number;
  cleaningIncluded?: boolean;
  lat?: number;
  lng?: number;
  owner?: {
    _id: string;
    ownerName?: string;
    ownerEmail?: string;
    slug?: string;
  } | null;
};

type OwnerRow = {
  _id: string;
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerPortalKey?: string;
  slug?: string;
  villasCount?: number;
};

type BlogPostRow = {
  _id: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  readingTime?: string;
  slug?: string;
  category?: { title?: string; slug?: string } | null;
  coverImageUrl?: string;
  coverImageAlt?: string;
};

type CityRow = {
  key: string;
  city: string;
  region: string;
  country: string;
  villasCount: number;
  geolocatedCount: number;
  avgLat?: number;
  avgLng?: number;
  examples: string[];
};

const VILLAS_QUERY = groq`
  *[_type=="villa" && defined(slug.current)]
    | order(_updatedAt desc)[0...500]{
      _id,
      _updatedAt,
      name,
      "slug": slug.current,
      street,
      postalCode,
      city,
      region,
      country,
      customDomain,
      priceMin,
      priceMax,
      cleaningIncluded,
      "lat": location.lat,
      "lng": location.lng,
      "owner": ownerSite->{
        _id,
        ownerName,
        ownerEmail,
        "slug": slug.current
      }
    }
`;

const OWNERS_QUERY = groq`
  *[_type=="ownerSite"]
    | order(ownerLastName asc, ownerFirstName asc)[0...500]{
      _id,
      ownerName,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerPhone,
      ownerPortalKey,
      "slug": slug.current,
      "villasCount": count(*[_type=="villa" && ownerSite._ref==^._id])
    }
`;

const POSTS_QUERY = groq`
  *[_type=="blogPost" && defined(slug.current)]
    | order(publishedAt desc)[0...500]{
      _id,
      title,
      excerpt,
      publishedAt,
      readingTime,
      "slug": slug.current,
      "category": category->{ title, "slug": slug.current },
      "coverImageUrl": coverImage.asset->url,
      "coverImageAlt": coalesce(coverImage.alt, title)
    }
`;

function getTab(input: unknown): TabKey {
  const raw = typeof input === "string" ? input : "";
  if (raw === "owners" || raw === "cities") return raw;
  if (raw === "posts" || raw === "articles") return "posts";
  return "villas";
}

function fmtMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(value: unknown) {
  const str = typeof value === "string" ? value : "";
  if (!str) return "—";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

function fmtCoord(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(5);
}

function buildAddress(v: Pick<VillaRow, "street" | "postalCode" | "city" | "region" | "country">) {
  return [v.street, v.postalCode, v.city, v.region, v.country]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function buildIcalExportUrl(v: Pick<VillaRow, "slug" | "customDomain">) {
  if (!v.slug) return "";
  const customDomain = typeof v.customDomain === "string" ? v.customDomain.trim() : "";
  const base = customDomain
    ? /^https?:\/\//i.test(customDomain)
      ? customDomain
      : `https://${customDomain}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(`/api/villas/${v.slug}/calendar.ics`, base).toString();
  } catch {
    return `${String(base).replace(/\/$/, "")}/api/villas/${v.slug}/calendar.ics`;
  }
}

function studioIntentHref(type: string, id: string) {
  return `/studio/intent/edit/id=${encodeURIComponent(id)};type=${encodeURIComponent(type)}`;
}

const FRANCE_BOUNDS = {
  west: -5.5,
  south: 41.0,
  east: 10.0,
  north: 51.5,
} as const;

function isValidLngLat(lat: unknown, lng: unknown) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function isWithinFranceBounds(lat: number, lng: number) {
  return (
    lng >= FRANCE_BOUNDS.west &&
    lng <= FRANCE_BOUNDS.east &&
    lat >= FRANCE_BOUNDS.south &&
    lat <= FRANCE_BOUNDS.north
  );
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !query.trim()) return null;
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${encodeURIComponent(token)}` +
      `&limit=1&language=fr&country=fr&types=address`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
    const center = data.features?.[0]?.center;
    if (!center || center.length !== 2) return null;
    const [lng, lat] = center;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function computeCities(villas: VillaRow[]) {
  const geocodeCache = new Map<string, Promise<{ lat: number; lng: number } | null>>();

  async function getGeocodedCoords(address: string) {
    const key = address.trim().toLowerCase();
    if (!key) return null;
    const existing = geocodeCache.get(key);
    if (existing) return existing;
    const pending = geocodeAddress(address);
    geocodeCache.set(key, pending);
    return pending;
  }

  const buckets = new Map<string, { row: CityRow; sumLat: number; sumLng: number }>();

  for (const v of villas) {
    const city = typeof v.city === "string" ? v.city.trim() : "";
    const region = typeof v.region === "string" ? v.region.trim() : "";
    const country = typeof v.country === "string" ? v.country.trim() : "";
    if (!city && !region && !country) continue;

    const key = [city || "—", region || "—", country || "—"].join("|");
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        row: {
          key,
          city: city || "—",
          region: region || "—",
          country: country || "—",
          villasCount: 0,
          geolocatedCount: 0,
          examples: [],
        },
        sumLat: 0,
        sumLng: 0,
      });
    }

    const bucket = buckets.get(key)!;
    bucket.row.villasCount += 1;
    if (bucket.row.examples.length < 4 && v.slug) bucket.row.examples.push(v.slug);

    const address = buildAddress(v);
    const stored = isValidLngLat(v.lat, v.lng);
    const geocoded = address ? await getGeocodedCoords(address) : null;
    const chosen =
      geocoded && isWithinFranceBounds(geocoded.lat, geocoded.lng)
        ? geocoded
        : stored && isWithinFranceBounds(stored.lat, stored.lng)
          ? stored
          : null;

    if (chosen) {
      bucket.row.geolocatedCount += 1;
      bucket.sumLat += chosen.lat;
      bucket.sumLng += chosen.lng;
    }
  }

  const rows: CityRow[] = [];
  for (const { row, sumLat, sumLng } of buckets.values()) {
    const denom = row.geolocatedCount || 0;
    rows.push({
      ...row,
      avgLat: denom ? sumLat / denom : undefined,
      avgLng: denom ? sumLng / denom : undefined,
    });
  }

  rows.sort((a, b) => (b.villasCount - a.villasCount) || a.city.localeCompare(b.city));
  return rows;
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "amber" }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";
  const styles =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900 ring-1 ring-amber-100"
        : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return <span className={[base, styles].join(" ")}>{children}</span>;
}

function NavItem({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm transition",
        active ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <span className={active ? "text-white" : "text-white/70 group-hover:text-white"}>{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
    </Link>
  );
}

function Table({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/redirect");

  const resolved = (await searchParams) ?? {};
  const tab = getTab(resolved.tab);
  const qRaw = typeof resolved.q === "string" ? resolved.q.trim() : "";
  const query = qRaw.toLowerCase();

  const token = process.env.SANITY_API_TOKEN;
  const privateClient = baseClient.withConfig({
    useCdn: false,
    token,
    perspective: token ? "drafts" : "published",
  });

  const [villas, owners, posts] = await Promise.all([
    privateClient.fetch<VillaRow[]>(VILLAS_QUERY),
    privateClient.fetch<OwnerRow[]>(OWNERS_QUERY),
    privateClient.fetch<BlogPostRow[]>(POSTS_QUERY),
  ]);

  const villaCount = villas.length;
  const ownerCount = owners.length;
  const postCount = posts.length;

  const cityCountAll = new Set(
    villas
      .map((v) => {
        const city = typeof v.city === "string" ? v.city.trim() : "";
        const region = typeof v.region === "string" ? v.region.trim() : "";
        const country = typeof v.country === "string" ? v.country.trim() : "";
        if (!city && !region && !country) return null;
        return [city || "—", region || "—", country || "—"].join("|");
      })
      .filter((x): x is string => Boolean(x))
  ).size;

  const cities = tab === "cities" ? await computeCities(villas) : [];
  const cityCount = cityCountAll;

  const baseHref = (nextTab: TabKey) =>
    `/admin?tab=${encodeURIComponent(nextTab)}${qRaw ? `&q=${encodeURIComponent(qRaw)}` : ""}`;

  const headerTitle =
    tab === "owners" ? "Propriétaires" : tab === "posts" ? "Articles" : tab === "cities" ? "Villes" : "Villas";

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50">
      <input id="admin-drawer" type="checkbox" className="peer sr-only" />

      <div className="grid h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden overflow-y-auto bg-slate-950 text-white lg:block">
          <div className="flex h-full flex-col gap-6 p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    Administration
                  </p>
                  <h1 className="mt-2 text-lg font-semibold tracking-tight">Chalet Manager</h1>
                </div>
                <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                  <Shield className="h-5 w-5 text-white/80" />
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">{session.user.email}</p>
                <p className="mt-1 text-xs text-white/60">Rôle: admin</p>
                <div className="mt-4">
                  <SignOutButton className="w-full justify-center bg-white text-slate-900 hover:bg-white/90" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <NavItem
                href={baseHref("villas")}
                label="Villas"
                icon={<House className="h-4 w-4" />}
                active={tab === "villas"}
                badge={<Pill tone="slate">{villaCount}</Pill>}
              />
              <NavItem
                href={baseHref("owners")}
                label="Propriétaires"
                icon={<Users className="h-4 w-4" />}
                active={tab === "owners"}
                badge={<Pill tone="slate">{ownerCount}</Pill>}
              />
              <NavItem
                href={baseHref("posts")}
                label="Articles"
                icon={<FileText className="h-4 w-4" />}
                active={tab === "posts"}
                badge={<Pill tone="slate">{postCount}</Pill>}
              />
              <NavItem
                href={baseHref("cities")}
                label="Villes"
                icon={<MapPin className="h-4 w-4" />}
                active={tab === "cities"}
                badge={<Pill tone="slate">{cityCount}</Pill>}
              />
            </div>

            <div className="mt-auto space-y-2">
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Raccourcis
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <Link
                    href="/studio"
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                  >
                    <span>Sanity Studio</span>
                    <span className="text-white/50">↗</span>
                  </Link>
                  <Link
                    href="/carte"
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Carte publique</span>
                    <span className="text-white/50">↗</span>
                  </Link>
                  <Link
                    href="/blog"
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Blog</span>
                    <span className="text-white/50">↗</span>
                  </Link>
                </div>
              </div>
              <p className="px-2 text-xs text-white/40">
                Données synchronisées depuis Sanity (useCdn: false).
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="admin-drawer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                  Menu
                </label>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Dashboard admin
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {headerTitle}
                  </h2>
                </div>
              </div>

              <form className="w-full max-w-xl" action="/admin" method="get">
                <input type="hidden" name="tab" value={tab} />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="q"
                    defaultValue={qRaw}
                    placeholder="Rechercher… (nom, ville, email, slug)"
                    className="w-full rounded-2xl bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <Pill tone="slate">{villaCount} villas</Pill>
              <Pill tone="slate">{ownerCount} propriétaires</Pill>
              <Pill tone="slate">{postCount} articles</Pill>
              <span className="ml-2 hidden text-slate-400 lg:inline">•</span>
              <span className="hidden text-slate-500 lg:inline">Astuce: ouvre une fiche directement dans le Studio depuis les actions.</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            {tab === "villas" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Toutes les villas</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Adresse, prix, propriétaire et coordonnées GPS (champ <code className="rounded bg-slate-100 px-1">location</code>).
                    </p>
                  </div>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                  >
                    Ouvrir le Studio <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <Table columns={["Villa", "Propriétaire", "Adresse", "Prix", "GPS", "Actions"]}>
                  {villas
                    .filter((v) => {
                      if (!query) return true;
                      const hay = [
                        v.name,
                        v.slug,
                        v.city,
                        v.region,
                        v.country,
                        v.owner?.ownerName,
                        v.owner?.ownerEmail,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();
                      return hay.includes(query);
                    })
                    .map((v) => {
                      const address = [v.street, v.postalCode, v.city].filter(Boolean).join(", ");
                      const ownerLabel = v.owner?.ownerName || v.owner?.ownerEmail || "—";
                      const hasCoords = isValidLngLat(v.lat, v.lng);
                      const icalExportUrl = buildIcalExportUrl(v);
                      const priceMaxDisplay =
                        typeof v.priceMax === "number" && Number.isFinite(v.priceMax) ? v.priceMax : v.priceMin;
                      return (
                        <tr key={v._id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{v.name || "—"}</p>
                              <p className="text-xs text-slate-500">{v.slug ? `/${v.slug}` : "—"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{ownerLabel}</p>
                              {v.owner?._id ? (
                                <p className="text-xs text-slate-500">
                                  <Link className="hover:underline" href={`/proprietaire/${v.owner._id}`}>
                                    Dashboard propriétaire →
                                  </Link>
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="text-slate-900">{address || "—"}</p>
                              <p className="text-xs text-slate-500">{[v.region, v.country].filter(Boolean).join(", ")}</p>
                              {icalExportUrl ? (
                                <p className="text-xs text-slate-500">
                                  iCal:{" "}
                                  <a
                                    className="break-all hover:underline"
                                    href={icalExportUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {icalExportUrl}
                                  </a>
                                </p>
                              ) : null}
                              {v.customDomain ? <Pill tone="amber">{v.customDomain}</Pill> : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">
                                {fmtMoney(v.priceMin)}{" "}
                                <span className="text-xs font-normal text-slate-500">/ nuit</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                max {fmtMoney(priceMaxDisplay)} • ménage{" "}
                                {v.cleaningIncluded ? <Pill tone="emerald">oui</Pill> : <Pill tone="slate">non</Pill>}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {hasCoords ? (
                              <div className="space-y-1 text-xs">
                                <p className="font-medium text-slate-900">
                                  {fmtCoord(hasCoords.lat)}, {fmtCoord(hasCoords.lng)}
                                </p>
                                <p className="text-slate-500">source: Sanity (geopoint)</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Pill tone="amber">manquant</Pill>
                                <p className="text-xs text-slate-500">sera géocodé depuis l’adresse sur /carte</p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              {v.slug ? (
                                <Link
                                  href={`/sites/${v.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                  Voir <span aria-hidden="true">↗</span>
                                </Link>
                              ) : null}
                              <Link
                                href={studioIntentHref("villa", v._id)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                              >
                                Éditer <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </Table>
              </div>
            ) : null}

            {tab === "owners" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Tous les propriétaires</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Comptes Sanity (ownerSite) utilisés pour l’accès propriétaire (MVP).
                  </p>
                </div>

                <Table columns={["Propriétaire", "Email", "Téléphone", "Villas", "Accès", "Actions"]}>
                  {owners
                    .filter((o) => {
                      if (!query) return true;
                      const hay = [o.ownerName, o.ownerEmail, o.ownerPhone, o.slug]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();
                      return hay.includes(query);
                    })
                    .map((o) => {
                      const name =
                        o.ownerName ||
                        [o.ownerFirstName, o.ownerLastName].filter(Boolean).join(" ") ||
                        "—";
                      return (
                        <tr key={o._id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{name}</p>
                              <p className="text-xs text-slate-500">{o.slug ? `/${o.slug}` : "—"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="font-medium text-slate-900">{o.ownerEmail || "—"}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="text-slate-900">{o.ownerPhone || "—"}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Pill tone="slate">{typeof o.villasCount === "number" ? o.villasCount : 0}</Pill>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1 text-xs">
                              <p className="text-slate-500">
                                Mot de passe partagé: <code className="rounded bg-slate-100 px-1">OWNER_PASSWORD</code>
                              </p>
                              {o.ownerPortalKey ? (
                                <p className="text-slate-500">
                                  key: <code className="rounded bg-slate-100 px-1">{o.ownerPortalKey}</code>
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/proprietaire/${o._id}`}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
                              >
                                Dashboard <span aria-hidden="true">→</span>
                              </Link>
                              <Link
                                href={studioIntentHref("ownerSite", o._id)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                              >
                                Éditer <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </Table>
              </div>
            ) : null}

            {tab === "posts" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tous les articles</p>
                    <p className="mt-1 text-sm text-slate-600">SEO-friendly: catégorie, slug, date, temps de lecture.</p>
                  </div>
                  <Link
                    href="/blog"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    Voir le blog <span aria-hidden="true">↗</span>
                  </Link>
                </div>

                <Table columns={["Article", "Catégorie", "Publication", "SEO", "Actions"]}>
                  {posts
                    .filter((p) => {
                      if (!query) return true;
                      const hay = [p.title, p.slug, p.category?.title, p.category?.slug]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();
                      return hay.includes(query);
                    })
                    .map((p) => {
                      return (
                        <tr key={p._id} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{p.title || "—"}</p>
                              <p className="text-xs text-slate-500">{p.slug ? `/blog/${p.slug}` : "—"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{p.category?.title || "—"}</p>
                              <p className="text-xs text-slate-500">{p.category?.slug ? `/${p.category.slug}` : ""}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="font-medium text-slate-900">{fmtDate(p.publishedAt)}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500">
                                lecture:{" "}
                                <span className="font-medium text-slate-900">{p.readingTime || "—"}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                cover:{" "}
                                {p.coverImageUrl ? <Pill tone="emerald">ok</Pill> : <Pill tone="amber">manquante</Pill>}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              {p.slug ? (
                                <Link
                                  href={`/blog/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                  Lire <span aria-hidden="true">↗</span>
                                </Link>
                              ) : null}
                              <Link
                                href={studioIntentHref("blogPost", p._id)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                              >
                                Éditer <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </Table>
              </div>
            ) : null}

            {tab === "cities" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Toutes les villes enregistrées</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Agrégées depuis les villas, avec coordonnées utilisées sur <code className="rounded bg-slate-100 px-1">/carte</code> (Mapbox → fallback geopoint).
                    </p>
                  </div>
                  <Link
                    href="/carte"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                  >
                    Ouvrir /carte <span aria-hidden="true">↗</span>
                  </Link>
                </div>

                <Table columns={["Ville", "Villas", "Géolocalisées", "Coordonnées (moyenne)", "Exemples"]}>
                  {cities
                    .filter((c) => {
                      if (!query) return true;
                      const hay = [c.city, c.region, c.country].filter(Boolean).join(" ").toLowerCase();
                      return hay.includes(query);
                    })
                    .map((c) => {
                      const hasAvg = isValidLngLat(c.avgLat, c.avgLng);
                      return (
                        <tr key={c.key} className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{c.city}</p>
                              <p className="text-xs text-slate-500">{[c.region, c.country].filter(Boolean).join(", ")}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Pill tone="slate">{c.villasCount}</Pill>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {c.geolocatedCount > 0 ? (
                              <Pill tone="emerald">{c.geolocatedCount}</Pill>
                            ) : (
                              <Pill tone="amber">0</Pill>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {hasAvg ? (
                              <div className="space-y-1 text-xs">
                                <p className="font-medium text-slate-900">
                                  {fmtCoord(hasAvg.lat)}, {fmtCoord(hasAvg.lng)}
                                </p>
                                <p className="text-slate-500">moyenne sur {c.geolocatedCount} villas</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Pill tone="amber">non géolocalisée</Pill>
                                <p className="text-xs text-slate-500">adresse invalide ou token Mapbox manquant</p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              {c.examples.map((slug) => (
                                <Link
                                  key={slug}
                                  href={`/sites/${slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                  {slug} <span aria-hidden="true">↗</span>
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </Table>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <label
        htmlFor="admin-drawer"
        className="fixed inset-0 z-40 hidden bg-black/40 peer-checked:block lg:hidden"
        aria-hidden="true"
      />

      <div className="fixed left-0 top-0 z-50 h-full w-[86%] max-w-[340px] -translate-x-full bg-slate-950 text-white shadow-2xl shadow-black/30 transition peer-checked:translate-x-0 lg:hidden">
        <div className="flex h-full flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Menu</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">Admin</p>
            </div>
            <label
              htmlFor="admin-drawer"
              className="cursor-pointer rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              Fermer
            </label>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">{session.user.email}</p>
            <p className="mt-1 text-xs text-white/60">Rôle: admin</p>
            <div className="mt-4">
              <SignOutButton className="w-full justify-center bg-white text-slate-900 hover:bg-white/90" />
            </div>
          </div>

          <div className="space-y-2">
            <NavItem
              href={baseHref("villas")}
              label="Villas"
              icon={<House className="h-4 w-4" />}
              active={tab === "villas"}
              badge={<Pill tone="slate">{villaCount}</Pill>}
            />
            <NavItem
              href={baseHref("owners")}
              label="Propriétaires"
              icon={<Users className="h-4 w-4" />}
              active={tab === "owners"}
              badge={<Pill tone="slate">{ownerCount}</Pill>}
            />
            <NavItem
              href={baseHref("posts")}
              label="Articles"
              icon={<FileText className="h-4 w-4" />}
              active={tab === "posts"}
              badge={<Pill tone="slate">{postCount}</Pill>}
            />
            <NavItem
              href={baseHref("cities")}
              label="Villes"
              icon={<MapPin className="h-4 w-4" />}
              active={tab === "cities"}
              badge={<Pill tone="slate">{cityCount}</Pill>}
            />
          </div>

          <div className="mt-auto space-y-2">
            <Link
              href="/studio"
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
            >
              <span>Ouvrir le Studio</span>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/carte"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
            >
              <span>Ouvrir /carte</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
