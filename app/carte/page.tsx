// app/carte/page.tsx
import { auth } from "@/auth";
import { client } from "@/sanity/lib/client";
import { VILLAS_FOR_MAP_QUERY } from "@/sanity/lib/queries";
import { FranceChaletMap as FranceMapClient } from "./FranceChaletMap";
import type { VillaMapPoint } from "./type";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type VillaForMapDoc = {
  _id?: string;
  name?: string;
  slug?: string;
  city?: string;
  region?: string;
  country?: string;
  street?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
};

async function geocodeAddress(
  query: string,
  types: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const token =
      process.env.MAPBOX_SECRET_TOKEN ||
      process.env.MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !query.trim()) return null;
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${encodeURIComponent(token)}` +
      `&limit=1&language=fr&country=fr&types=${encodeURIComponent(types)}`;
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

export default async function CartePage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const token = process.env.SANITY_API_TOKEN;
  const sanityClient = client.withConfig({
    useCdn: false,
    token: isAdmin ? token : undefined,
    perspective: isAdmin && token ? "drafts" : "published",
  });

  const raw = await sanityClient.fetch<VillaForMapDoc[]>(VILLAS_FOR_MAP_QUERY);
  // Normalize and geocode when needed
  const geocodeCache = new Map<string, Promise<{ lat: number; lng: number } | null>>();

  async function getGeocodedCoords(address: string, types: string) {
    const key = `${types}:${address.trim().toLowerCase()}`;
    if (!key) return null;
    const existing = geocodeCache.get(key);
    if (existing) return existing;
    const pending = geocodeAddress(address, types);
    geocodeCache.set(key, pending);
    return pending;
  }

  const villas: VillaMapPoint[] = [];
  const skipped: Array<{ slug: string; name: string }> = [];

  for (const doc of raw) {
    const slug = doc?.slug as string | undefined;
    const name = doc?.name as string | undefined;
    if (!slug || !name) continue;

    const fullAddress = [doc?.street, doc?.postalCode, doc?.city, doc?.region, doc?.country]
      .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : ""))
      .filter(Boolean)
      .join(", ");

    const storedCoords = isValidLngLat(doc?.lat, doc?.lng);
    const storedInFrance =
      storedCoords && isWithinFranceBounds(storedCoords.lat, storedCoords.lng) ? storedCoords : null;

    let chosen = storedInFrance;

    if (!chosen) {
      const geocoded = fullAddress ? await getGeocodedCoords(fullAddress, "address") : null;
      const geocodedInFrance =
        geocoded && isWithinFranceBounds(geocoded.lat, geocoded.lng) ? geocoded : null;
      chosen = geocodedInFrance;
    }

    if (!chosen) {
      const fallbackQuery = [doc?.postalCode, doc?.city, doc?.region, doc?.country]
        .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : ""))
        .filter(Boolean)
        .join(", ");
      const geocodedFallback = fallbackQuery
        ? await getGeocodedCoords(fallbackQuery, "place,locality,postcode")
        : null;
      const geocodedFallbackInFrance =
        geocodedFallback && isWithinFranceBounds(geocodedFallback.lat, geocodedFallback.lng)
          ? geocodedFallback
          : null;
      chosen = geocodedFallbackInFrance;
    }

    if (chosen) {
      villas.push({
        _id: String(doc?._id || slug),
        name,
        slug,
        city: typeof doc?.city === "string" ? doc.city : undefined,
        region: typeof doc?.region === "string" ? doc.region : undefined,
        country: typeof doc?.country === "string" ? doc.country : undefined,
        lat: chosen.lat,
        lng: chosen.lng,
      });
    } else {
      skipped.push({ slug, name });
    }
  }

  // Si aucune villa géolocalisée, on peut rendre un état vide minimal
  if (!villas || villas.length === 0) {
    return (
      <main className="h-screen w-screen">
        <div className="flex h-full w-full flex-col px-4 py-8 md:px-6">
          <div className="my-auto max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Carte interactive</h1>
            <p className="mt-2 text-sm text-white/70">
              Aucune villa n’a encore de coordonnées GPS (champ{" "}
              <code className="rounded bg-white/10 px-1">location</code>).
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen 0">
      <div className="flex h-full w-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/10 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Carte interactive</h1>
              <p className="mt-1 text-sm text-white/70">
                Animation France → zoom, puis apparition des villas.
              </p>
              {skipped.length > 0 ? (
                <p className="mt-2 text-xs text-white/60">
                  {skipped.length} villas sans coordonnées (adresse invalide ou token Mapbox manquant).
                </p>
              ) : null}
              {isAdmin ? (
                <p className="mt-2 text-xs text-white/60">
                  Mode admin: {token ? "brouillons inclus" : "token Sanity manquant (brouillons non disponibles)"}.
                </p>
              ) : null}
            </div>

            <div className="text-right text-xs text-white/60">{villas.length} villas</div>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <FranceMapClient villas={villas} />
        </div>
      </div>
    </main>
  );
}
