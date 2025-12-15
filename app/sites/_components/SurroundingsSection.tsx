// app/sites/_components/SurroundingsSection.tsx
import { Car, Footprints, Ship } from "lucide-react";
import type { Villa, DistanceItem } from "./villa-types";
import { MapboxMap } from "./MapboxMap";

interface SurroundingsSectionProps {
  villa: Villa;
}

function TransportIcon({ by }: { by: DistanceItem["by"] }) {
  if (by === "car") return <Car className="h-4 w-4" aria-hidden="true" />;
  if (by === "walk") return <Footprints className="h-4 w-4" aria-hidden="true" />;
  return <Ship className="h-4 w-4" aria-hidden="true" />;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function formatFullAddress(parts: Array<unknown>) {
  return parts
    .filter(isNonEmptyString)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

function isValidLatLng(lat: unknown, lng: unknown) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Géocodage Mapbox (serveur) : adresse -> {lat,lng}
 * - nécessite MAPBOX_SECRET_TOKEN (ou MAPBOX_TOKEN côté serveur)
 * - cache 1 jour (revalidate)
 */
async function geocodeWithMapbox(query: string): Promise<{ lat: number; lng: number } | null> {
  // Fallback to NEXT_PUBLIC_MAPBOX_TOKEN so SSR can geocode if only the public token is configured
  const token =
    process.env.MAPBOX_SECRET_TOKEN ||
    process.env.MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !isNonEmptyString(query)) return null;

  const encoded = encodeURIComponent(query.trim());
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=fr&country=fr&types=address,place,postcode`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };

    const center = data.features?.[0]?.center;
    if (!center || center.length !== 2) return null;

    const [lng, lat] = center;
    if (!isValidLatLng(lat, lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

export async function SurroundingsSection({ villa }: SurroundingsSectionProps) {
  // Champs texte (tolérant si le type Villa n'est pas parfaitement aligné)
  const v = villa as unknown as Record<string, unknown>;

  const surroundingsIntro = isNonEmptyString(v.surroundingsIntro) ? v.surroundingsIntro : "";
  const environmentType = isNonEmptyString(v.environmentType) ? v.environmentType : "";

  const distancesRaw = Array.isArray(v.distances) ? (v.distances as any[]) : [];
  const safeDistances = distancesRaw.filter(
    (d) =>
      d &&
      isNonEmptyString(d.label) &&
      isNonEmptyString(d.duration) &&
      (d.by === "car" || d.by === "walk" || d.by === "boat")
  ) as Array<{ label: string; duration: string; by: DistanceItem["by"] }>;

  // Adresse (source de vérité)
  const street = isNonEmptyString(v.street) ? v.street : "";
  const postalCode = isNonEmptyString(v.postalCode) ? v.postalCode : "";
  const city = isNonEmptyString(v.city) ? v.city : "";
  const region = isNonEmptyString(v.region) ? v.region : "";
  const country = isNonEmptyString(v.country) ? v.country : "";

  const fullAddress = formatFullAddress([street, postalCode, city, country]);
  const fallbackAddress = formatFullAddress([region, country]);

  // 1) si coords existent déjà, on les utilise
  const loc = (v.location ?? null) as null | { lat?: unknown; lng?: unknown };
  const hasStoredCoords = !!loc && isValidLatLng(loc.lat, loc.lng);

  // 2) sinon géocodage depuis l’adresse (serveur)
  const geoQuery = fullAddress || fallbackAddress;

  const coords = hasStoredCoords
    ? { lat: loc!.lat as number, lng: loc!.lng as number }
    : geoQuery
      ? await geocodeWithMapbox(geoQuery)
      : null;

  const hasAny =
    !!surroundingsIntro ||
    !!environmentType ||
    safeDistances.length > 0 ||
    !!geoQuery;

  if (!hasAny) return null;

  return (
    <section aria-labelledby="alentours">
      <div className="space-y-5">
        <h2
          id="alentours"
          className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
        >
          Les alentours
        </h2>

        {surroundingsIntro ? (
          <p className="text-sm leading-relaxed text-slate-700">{surroundingsIntro}</p>
        ) : null}

        {environmentType ? (
          <p className="text-xs text-slate-600">{environmentType}</p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Distances */}
          {safeDistances.length > 0 ? (
            <div className="space-y-3">
              {safeDistances.map((item, index) => (
                <div
                  key={`${item.label}-${item.by}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-slate-100 p-1.5 text-slate-600">
                      <TransportIcon by={item.by} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    {item.duration}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          {/* Carte Mapbox */}
          <div className="relative h-72 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {coords ? (
              <>
                <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-black/15 via-black/0 to-black/0" />

                <div className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm ring-1 ring-black/5">
                  Localisation
                  {region ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {region}
                    </span>
                  ) : null}
                </div>

                <div className="absolute inset-0">
                  <MapboxMap lat={coords.lat} lng={coords.lng} name={villa.name} />
                </div>
              </>
            ) : (
              <div className="relative flex h-full flex-col justify-between bg-linear-to-br from-sky-100 via-emerald-50 to-amber-50 p-4">
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-600">
                    Localisation
                  </p>

                  {region || country ? (
                    <div className="mt-1 flex items-center gap-2">
                      {region ? (
                        <p className="text-xs font-medium text-slate-800">{region}</p>
                      ) : null}
                      {country ? (
                        <p className="text-[10px] text-slate-600">{country}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {fullAddress ? (
                    <p className="mt-2 text-[10px] text-slate-600">{fullAddress}</p>
                  ) : (
                    <p className="mt-2 text-[10px] text-slate-600">
                      Adresse indisponible.
                    </p>
                  )}

                  <p className="mt-3 text-[10px] text-slate-600">
                    Carte indisponible tant que l’adresse ne peut pas être géocodée.
                  </p>
                </div>

                <p className="text-[9px] text-slate-600">
                  La localisation exacte est communiquée après confirmation de votre réservation.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[9px] text-slate-600">
          La localisation exacte est communiquée après confirmation de votre réservation.
        </p>
      </div>
    </section>
  );
}
