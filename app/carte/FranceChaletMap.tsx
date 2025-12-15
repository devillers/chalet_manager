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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
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

      const newMarkers: mapboxgl.Marker[] = [];

      pts.forEach((v, idx) => {
        const el = document.createElement("div");
        el.className = "chalet-marker";

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

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
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
          zoom: 10,
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
        maxZoom: 10.5,
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
      map.remove();
      mapRef.current = null;
    };
  }, [token, points, prefersReducedMotion, router]);

  return (
    <section className="relative overflow-hidden rounded-3xl  bg-black">
      <div ref={containerRef} className="h-[70vh] w-full md:h-[74vh]" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/45 px-3 py-2 text-xs text-white ring-1 ring-white/10 backdrop-blur">
        <div className="font-medium">Carte</div>
        <div className="text-white/70">
          {isReady ? "Points affichés" : "Animation…"}
        </div>
      </div>
    </section>
  );
}
