// app/carte/page.tsx
import { client } from "@/sanity/lib/client";
import { VILLAS_FOR_MAP_QUERY } from "@/sanity/lib/queries";
import { FranceChaletMap as FranceMapClient } from "./FranceChaletMap";
import type { VillaMapPoint } from "./type";

export const revalidate = 60;

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !query.trim()) return null;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&limit=1&language=fr`;
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
  const raw = await client.fetch<any[]>(VILLAS_FOR_MAP_QUERY);
  // Normalize and geocode when needed
  const villas: VillaMapPoint[] = [];
  for (const doc of raw) {
    const slug = doc?.slug as string | undefined;
    const name = doc?.name as string | undefined;
    if (!slug || !name) continue;

    let lat = typeof doc?.lat === "number" ? doc.lat : undefined;
    let lng = typeof doc?.lng === "number" ? doc.lng : undefined;

    if (!(typeof lat === "number" && typeof lng === "number")) {
      const address = [doc?.street, doc?.postalCode, doc?.city, doc?.country]
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .join(", ");
      const coords = address ? await geocodeAddress(address) : null;
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    if (typeof lat === "number" && typeof lng === "number") {
      villas.push({
        _id: String(doc?._id || slug),
        name,
        slug,
        city: typeof doc?.city === "string" ? doc.city : undefined,
        region: typeof doc?.region === "string" ? doc.region : undefined,
        country: typeof doc?.country === "string" ? doc.country : undefined,
        lat,
        lng,
      });
    }
  }

  // Si aucune villa géolocalisée, on peut rendre un état vide minimal
  if (!villas || villas.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Carte interactive</h1>
            <p className="mt-2 text-sm text-white/70">
              Aucune villa n’a encore de coordonnées GPS (champ <code className="rounded bg-white/10 px-1">location</code>).
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Carte interactive
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Animation France → zoom, puis apparition des villas.
            </p>
          </div>
          <div className="hidden text-right text-xs text-white/60 md:block">
            {villas.length} villas
          </div>
        </div>

        <div className="flex-1 pb-4">
          <FranceMapClient villas={villas} />
        </div>
      </div>
    </main>
  );
}
