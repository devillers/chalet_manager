// app/carte/FranceChaletMap.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
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

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/sites/${encodeURIComponent(v.slug)}`);
        });

        const subtitle = v.city || v.region || v.country || "";
        const popupNode = document.createElement("div");
        popupNode.style.minWidth = "200px";

        const title = document.createElement("div");
        title.textContent = v.name;
        title.style.fontWeight = "600";
        title.style.marginBottom = "6px";
        popupNode.appendChild(title);

        if (subtitle) {
          const sub = document.createElement("div");
          sub.textContent = subtitle;
          sub.style.fontSize = "12px";
          sub.style.opacity = "0.75";
          sub.style.marginBottom = "8px";
          popupNode.appendChild(sub);
        }

        const hint = document.createElement("div");
        hint.textContent = "Clique sur le point pour ouvrir la fiche.";
        hint.style.fontSize = "12px";
        hint.style.opacity = "0.7";
        popupNode.appendChild(hint);

        const popup = new mapboxgl.Popup({
          offset: 18,
          closeButton: true,
          closeOnClick: true,
          maxWidth: "280px",
        }).setDOMContent(popupNode);

        const marker = new mapboxgl.Marker({ element: el, anchor: "center", offset })
          .setLngLat([v.lng, v.lat])
          .setPopup(popup)
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
          {isReady ? `${points.length} villas affichées` : "Animation…"}
        </div>
      </div>
    </section>
  );
}
