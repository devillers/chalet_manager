// app/carte/FranceChaletMap.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { Bath, ExternalLink, MapPin, Ruler, Users } from "lucide-react";
import type { VillaMapPoint } from "./type";

type Props = {
  villas: VillaMapPoint[];
};

const FRANCE_CENTER: [number, number] = [2.2137, 46.2276];

const FRANCE_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-5.5, 41.0],
  [10.0, 51.5],
];

const OVERLAP_THRESHOLD_PX = 34;
const MARKER_SAFE_DIAMETER_PX = 38;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function truncate(value: string, maxChars: number) {
  const s = value.trim();
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars - 1).trimEnd()}…`;
}

function computeMarkerOffsets(map: mapboxgl.Map, pts: VillaMapPoint[]) {
  const projected = pts.map((villa) => ({
    villa,
    point: map.project([villa.lng, villa.lat]),
  }));

  const parent = projected.map((_, idx) => idx);

  function find(i: number): number {
    let cur = i;
    while (parent[cur] !== cur) {
      parent[cur] = parent[parent[cur]];
      cur = parent[cur];
    }
    return cur;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < projected.length; i++) {
    for (let j = i + 1; j < projected.length; j++) {
      const dx = projected[i].point.x - projected[j].point.x;
      const dy = projected[i].point.y - projected[j].point.y;
      if (Math.hypot(dx, dy) < OVERLAP_THRESHOLD_PX) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < projected.length; i++) {
    const root = find(i);
    const existing = groups.get(root);
    if (existing) existing.push(i);
    else groups.set(root, [i]);
  }

  const offsets = new Map<string, mapboxgl.PointLike>();

  for (const indices of groups.values()) {
    if (indices.length === 1) {
      const villa = projected[indices[0]].villa;
      offsets.set(villa._id, [0, 0]);
      continue;
    }

    // Stable ordering for deterministic offsets
    indices.sort((a, b) => projected[a].villa.slug.localeCompare(projected[b].villa.slug));

    const n = indices.length;
    const denom = 2 * Math.sin(Math.PI / n);
    const radius =
      denom > 0
        ? Math.min(72, Math.max(18, Math.ceil(MARKER_SAFE_DIAMETER_PX / denom)))
        : 28;

    const startAngle = -Math.PI / 2;
    for (let idx = 0; idx < n; idx++) {
      const angle = startAngle + (idx * 2 * Math.PI) / n;
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      const villa = projected[indices[idx]].villa;
      offsets.set(villa._id, [x, y]);
    }
  }

  return offsets;
}

export function FranceChaletMap({ villas }: Props) {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [isReady, setIsReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);

  const points = useMemo(
    () =>
      (villas ?? []).filter(
        (v) =>
          Number.isFinite(v.lat) &&
          Number.isFinite(v.lng) &&
          Math.abs(v.lat) <= 90 &&
          Math.abs(v.lng) <= 180 &&
          !!v.slug
      ),
    [villas]
  );

  const sortedPoints = useMemo(() => {
    const copy = [...points];
    copy.sort((a, b) => {
      const aCity = a.city || a.region || "";
      const bCity = b.city || b.region || "";
      return aCity.localeCompare(bCity) || a.name.localeCompare(b.name);
    });
    return copy;
  }, [points]);

  const previewVilla = useMemo(() => {
    if (!sortedPoints.length) return null;
    if (hoveredId) return sortedPoints.find((v) => v._id === hoveredId) ?? sortedPoints[0];
    return sortedPoints[0];
  }, [sortedPoints, hoveredId]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    if (!token) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN manquant (.env.local).");
      return;
    }

    let cancelled = false;

    // ✅ Helpers déclarés AVANT usage (plus d'erreur ESLint)
    function clearMarkers() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    }

    function spawnMarkers(map: mapboxgl.Map, pts: VillaMapPoint[]) {
      clearMarkers();

      const offsets = computeMarkerOffsets(map, pts);
      const newMarkers: mapboxgl.Marker[] = [];

      pts.forEach((v, idx) => {
        const el = document.createElement("div");
        el.className = "chalet-marker";
        const offset = offsets.get(v._id) ?? [0, 0];

        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", `Ouvrir ${v.name}`);

        const handleEnter = () => setHoveredId(v._id);
        const handleLeave = () => setHoveredId((prev) => (prev === v._id ? null : prev));

        el.addEventListener("mouseenter", handleEnter);
        el.addEventListener("mouseleave", handleLeave);
        el.addEventListener("focus", handleEnter);
        el.addEventListener("blur", handleLeave);

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/sites/${encodeURIComponent(v.slug)}`);
        });

        el.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          router.push(`/sites/${encodeURIComponent(v.slug)}`);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center", offset })
          .setLngLat([v.lng, v.lat])
          .addTo(map);

        window.setTimeout(() => el.classList.add("is-visible"), 220 + idx * 110);

        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
    }

    function zoomToPointsThenReveal(
      map: mapboxgl.Map,
      pts: VillaMapPoint[],
      instant: boolean
    ) {
      if (!pts.length) return;

      // 1 point => évite un fitBounds trop agressif
      if (pts.length === 1) {
        const p = pts[0];
        map.easeTo({
          center: [p.lng, p.lat],
          zoom: 12.5,
          bearing: -18,
          pitch: 62,
          duration: instant ? 0 : 1200,
          essential: true,
        });

        map.once("moveend", () => {
          if (cancelled) return;
          setIsReady(true);
          spawnMarkers(map, pts);
        });

        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      for (const p of pts) bounds.extend([p.lng, p.lat]);

      map.fitBounds(bounds, {
        padding: { top: 140, left: 40, right: 40, bottom: 40 },
        maxZoom: 13.5,
        duration: instant ? 0 : 2400,
        bearing: -18,
        pitch: 62,
        essential: true,
      });

      map.once("moveend", () => {
        if (cancelled) return;
        setIsReady(true);
        spawnMarkers(map, pts);
      });
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: FRANCE_CENTER,
      zoom: 4.7,
      pitch: 0,
      bearing: 0,
      antialias: true,
      maxBounds: FRANCE_BOUNDS,
      cooperativeGestures: true,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    const resizeObserver = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {}
    });
    resizeObserver.observe(containerRef.current);

    map.on("load", () => {
      if (cancelled) return;

      // Terrain optionnel
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.25 });
      } catch {}

      if (prefersReducedMotion) {
        zoomToPointsThenReveal(map, points, true);
        return;
      }

      map.easeTo({
        pitch: 35,
        bearing: -8,
        duration: 900,
        easing: easeOutCubic,
      });

      window.setTimeout(() => {
        if (cancelled) return;
        zoomToPointsThenReveal(map, points, false);
      }, 950);
    });

    return () => {
      cancelled = true;
      clearMarkers();
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [token, points, prefersReducedMotion, router]);

  return (
    <section className="relative h-full w-full overflow-hidden bg-black md:rounded-3xl">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/45 px-3 py-2 text-xs text-white ring-1 ring-white/10 backdrop-blur">
        <div className="font-medium">Carte</div>
        <div className="text-white/70">
          {isReady ? `${points.length} villas · survol = aperçu · clic = ouvrir` : "Animation…"}
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="absolute bottom-4 left-4 z-10 md:hidden">
        <button
          type="button"
          onClick={() => setIsListOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-black/20"
        >
          <MapPin className="h-4 w-4" />
          {isListOpen ? "Masquer la liste" : "Liste des villas"}
        </button>
      </div>

      {/* Desktop properties panel */}
      <aside className="absolute right-4 top-4 z-10 hidden max-h-[calc(100%-2rem)] w-[360px] overflow-hidden rounded-3xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl md:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Propriétés</p>
            <p className="mt-1 text-sm text-white/80">{sortedPoints.length} villas</p>
          </div>

          <div className="p-5">
            {previewVilla ? (
              <div className="overflow-hidden rounded-2xl bg-black/25 ring-1 ring-white/10">
                {previewVilla.imageUrl ? (
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-black/40">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${previewVilla.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-sm font-semibold text-white">{previewVilla.name}</p>
                      <p className="mt-1 text-xs text-white/70">
                        {previewVilla.city || previewVilla.region || previewVilla.country || "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm font-semibold text-white">{previewVilla.name}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {previewVilla.city || previewVilla.region || previewVilla.country || "—"}
                    </p>
                  </div>
                )}

                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <Users className="h-4 w-4" />
                        Pers.
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {typeof previewVilla.maxGuests === "number" ? previewVilla.maxGuests : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <Bath className="h-4 w-4" />
                        SDB
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {typeof previewVilla.bathrooms === "number" ? previewVilla.bathrooms : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <Ruler className="h-4 w-4" />
                        m²
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {typeof previewVilla.surface === "number" ? previewVilla.surface : "—"}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-white/80">
                    {previewVilla.intro ? truncate(previewVilla.intro, 160) : "—"}
                  </p>

                  <button
                    type="button"
                    onClick={() => router.push(`/sites/${encodeURIComponent(previewVilla.slug)}`)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-white/90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir la fiche
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
                Aucune villa géolocalisée.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 border-t border-white/10">
            <div className="max-h-full overflow-y-auto p-3">
              <div className="space-y-2">
                {sortedPoints.map((v) => {
                  const isActive = v._id === previewVilla?._id;
                  return (
                    <button
                      key={v._id}
                      type="button"
                      onMouseEnter={() => setHoveredId(v._id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(v._id)}
                      onBlur={() => setHoveredId(null)}
                      onClick={() => router.push(`/sites/${encodeURIComponent(v.slug)}`)}
                      className={[
                        "w-full rounded-2xl px-3 py-3 text-left transition ring-1 ring-inset",
                        isActive ? "bg-white/10 ring-white/15" : "bg-white/5 ring-white/10 hover:bg-white/10",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{v.name}</p>
                          <p className="mt-1 text-xs text-white/65">{v.city || v.region || v.country || "—"}</p>
                        </div>
                        <span className="text-xs text-white/60">↗</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile panel */}
      <aside className={["absolute inset-x-4 bottom-16 z-10 md:hidden", isListOpen ? "block" : "hidden"].join(" ")}>
        <div className="max-h-[55vh] overflow-hidden rounded-3xl bg-white/10 ring-1 ring-white/15 backdrop-blur-xl">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Propriétés</p>
            <p className="mt-1 text-sm text-white/80">{sortedPoints.length} villas</p>
          </div>

          <div className="max-h-[calc(55vh-4rem)] overflow-y-auto p-3">
            <div className="space-y-2">
              {sortedPoints.map((v) => (
                <button
                  key={v._id}
                  type="button"
                  onMouseEnter={() => setHoveredId(v._id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(v._id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => router.push(`/sites/${encodeURIComponent(v.slug)}`)}
                  className="w-full rounded-2xl bg-white/5 px-3 py-3 text-left ring-1 ring-inset ring-white/10 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{v.name}</p>
                      <p className="mt-1 text-xs text-white/65">{v.city || v.region || v.country || "—"}</p>
                    </div>
                    <span className="text-xs text-white/60">↗</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
