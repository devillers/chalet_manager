// app/carte/FranceChaletMap.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bath,
  BedDouble,
  CloudFog,
  ExternalLink,
  Film,
  Flame,
  Ruler,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
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

const CARD_FALLBACK_WIDTH = 360;
const CARD_FALLBACK_HEIGHT = 380;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

    indices.sort((a, b) => projected[a].villa.slug.localeCompare(projected[b].villa.slug));

    const n = indices.length;
    const denom = 2 * Math.sin(Math.PI / n);
    const radius = denom > 0 ? Math.min(72, Math.max(18, Math.ceil(MARKER_SAFE_DIAMETER_PX / denom))) : 28;

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

const AMENITY_PRESETS = [
  { key: "jacuzzi", label: "Jacuzzi", Icon: Sparkles, match: ["jacuzzi", "spa", "hot tub", "bain bouillonnant"] },
  { key: "sauna", label: "Sauna", Icon: Flame, match: ["sauna"] },
  { key: "piscine", label: "Piscine", Icon: Waves, match: ["piscine", "pool"] },
  { key: "hammam", label: "Hammam", Icon: CloudFog, match: ["hammam", "steam"] },
  { key: "cinema", label: "Cinéma", Icon: Film, match: ["cinema", "home cinema", "salle cinema", "movie"] },
] as const;

function resolveAmenityBadges(amenities?: string[]) {
  const normalized = (amenities ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return AMENITY_PRESETS.filter((preset) =>
    preset.match.some((needle) => normalized.some((value) => value.includes(needle)))
  );
}

function toOffsetTuple(offset?: mapboxgl.PointLike): [number, number] {
  if (!offset) return [0, 0];
  if (Array.isArray(offset)) {
    const [x, y] = offset;
    return [typeof x === "number" ? x : 0, typeof y === "number" ? y : 0];
  }
  if (typeof offset === "object" && "x" in offset && "y" in offset) {
    const x = (offset as { x: unknown }).x;
    const y = (offset as { y: unknown }).y;
    return [typeof x === "number" ? x : 0, typeof y === "number" ? y : 0];
  }
  return [0, 0];
}

type CardPlacement = {
  x: number;
  y: number;
  side: "left" | "right";
};

type Breadcrumb = {
  start: { x: number; y: number };
  end: { x: number; y: number };
};

function computeCardPlacement(
  rootSize: { width: number; height: number },
  anchor: { x: number; y: number },
  cardSize: { width: number; height: number }
): CardPlacement {
  const margin = 18;
  const gap = 16;
  const width = Math.min(cardSize.width, Math.max(240, rootSize.width - margin * 2));
  const height = Math.min(cardSize.height, Math.max(260, rootSize.height - margin * 2));

  const canPlaceRight = anchor.x + gap + width + margin <= rootSize.width;
  const canPlaceLeft = anchor.x - gap - width - margin >= 0;

  const side: CardPlacement["side"] = canPlaceRight || !canPlaceLeft ? "right" : "left";
  const rawX = side === "right" ? anchor.x + gap : anchor.x - gap - width;
  const rawY = anchor.y - height * 0.28;

  const x = clamp(rawX, margin, rootSize.width - width - margin);
  const y = clamp(rawY, margin, rootSize.height - height - margin);

  return { x, y, side };
}

export function FranceChaletMap({ villas }: Props) {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const rootRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const offsetsRef = useRef<Map<string, mapboxgl.PointLike>>(new Map());

  const hoverClearTimeoutRef = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<CardPlacement | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimeoutRef.current) {
      window.clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
  }, []);

  const activateVilla = useCallback(
    (id: string) => {
      cancelHoverClear();
      setActiveId(id);
    },
    [cancelHoverClear]
  );

  const scheduleHoverClear = useCallback(
    (id: string) => {
      cancelHoverClear();
      hoverClearTimeoutRef.current = window.setTimeout(() => {
        if (activeIdRef.current !== id) return;
        setActiveId(null);
        setCardPos(null);
        setBreadcrumb(null);
      }, 170);
    },
    [cancelHoverClear]
  );

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

  const activeVilla = useMemo(() => {
    if (!activeId) return null;
    return points.find((villa) => villa._id === activeId) ?? null;
  }, [points, activeId]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const primeOverlayFromMarkerEl = useCallback((el: HTMLDivElement) => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const anchor = {
      x: rect.left - rootRect.left + rect.width / 2,
      y: rect.top - rootRect.top + rect.height / 2,
    };
    setCardPos(
      computeCardPlacement(
        { width: rootRect.width, height: rootRect.height },
        anchor,
        { width: CARD_FALLBACK_WIDTH, height: CARD_FALLBACK_HEIGHT }
      )
    );
    setBreadcrumb(null);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    if (!token) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN manquant (.env.local).");
      return;
    }

    let cancelled = false;

    function clearMarkers() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    }

    function spawnMarkers(map: mapboxgl.Map, pts: VillaMapPoint[]) {
      clearMarkers();

      const offsets = computeMarkerOffsets(map, pts);
      offsetsRef.current = offsets;

      const newMarkers: mapboxgl.Marker[] = [];

      pts.forEach((villa, idx) => {
        const el = document.createElement("div");
        el.className = "chalet-marker";
        el.dataset.villaId = villa._id;
        const offset = offsets.get(villa._id) ?? [0, 0];

        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", `Ouvrir ${villa.name}`);

        const handleEnter = () => {
          el.classList.add("is-active");
          primeOverlayFromMarkerEl(el);
          activateVilla(villa._id);
        };
        const handleLeave = () => {
          scheduleHoverClear(villa._id);
        };

        el.addEventListener("mouseenter", handleEnter);
        el.addEventListener("mouseleave", handleLeave);
        el.addEventListener("focus", handleEnter);
        el.addEventListener("blur", handleLeave);

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/sites/${encodeURIComponent(villa.slug)}`);
        });

        el.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          router.push(`/sites/${encodeURIComponent(villa.slug)}`);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center", offset })
          .setLngLat([villa.lng, villa.lat])
          .addTo(map);

        window.setTimeout(() => el.classList.add("is-visible"), 220 + idx * 110);

        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
    }

    function zoomToPointsThenReveal(map: mapboxgl.Map, pts: VillaMapPoint[], instant: boolean) {
      if (!pts.length) return;

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

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    const resizeObserver = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {}
    });
    resizeObserver.observe(containerRef.current);

    map.on("load", () => {
      if (cancelled) return;

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
      cancelHoverClear();
      clearMarkers();
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [activateVilla, cancelHoverClear, points, prefersReducedMotion, primeOverlayFromMarkerEl, router, scheduleHoverClear, token]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement() as HTMLDivElement;
      const id = el.dataset.villaId;
      if (!id) return;
      el.classList.toggle("is-active", id === activeId);
    });
  }, [activeId]);

  useEffect(() => {
    const map = mapRef.current;
    const root = rootRef.current;
    const container = containerRef.current;
    if (!activeVilla || !map || !root || !container) return;

    let raf: number | null = null;
    let retryTimeout: number | null = null;

    const update = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const card = cardRef.current;
        if (!card) {
          if (!retryTimeout) retryTimeout = window.setTimeout(update, 40);
          return;
        }

        const rootRect = root.getBoundingClientRect();
        const mapRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        const projected = map.project([activeVilla.lng, activeVilla.lat]);
        const [ox, oy] = toOffsetTuple(offsetsRef.current.get(activeVilla._id));

        const anchorX = mapRect.left - rootRect.left + projected.x + ox;
        const anchorY = mapRect.top - rootRect.top + projected.y + oy;

        const placement = computeCardPlacement(
          { width: rootRect.width, height: rootRect.height },
          { x: anchorX, y: anchorY },
          { width: cardRect.width, height: cardRect.height }
        );

        setCardPos((prev) => {
          if (
            prev &&
            prev.side === placement.side &&
            Math.abs(prev.x - placement.x) < 0.5 &&
            Math.abs(prev.y - placement.y) < 0.5
          ) {
            return prev;
          }
          return placement;
        });

        const endX = placement.side === "right" ? placement.x : placement.x + cardRect.width;
        const endY = placement.y + Math.min(170, cardRect.height * 0.32);

        setBreadcrumb((prev) => {
          if (
            prev &&
            Math.abs(prev.start.x - anchorX) < 0.5 &&
            Math.abs(prev.start.y - anchorY) < 0.5 &&
            Math.abs(prev.end.x - endX) < 0.5 &&
            Math.abs(prev.end.y - endY) < 0.5
          ) {
            return prev;
          }
          return { start: { x: anchorX, y: anchorY }, end: { x: endX, y: endY } };
        });
      });
    };

    const ro = new ResizeObserver(update);
    if (cardRef.current) ro.observe(cardRef.current);

    update();
    map.on("move", update);
    window.addEventListener("resize", update);

    return () => {
      map.off("move", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
      if (retryTimeout) window.clearTimeout(retryTimeout);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [activeVilla]);

  const breadcrumbPath = useMemo(() => {
    if (!breadcrumb) return "";
    const { start, end } = breadcrumb;
    const dir = end.x >= start.x ? 1 : -1;
    const dx = Math.max(110, Math.min(240, Math.abs(end.x - start.x) * 0.55));
    return `M ${start.x} ${start.y} C ${start.x + dir * dx} ${start.y}, ${end.x - dir * dx} ${end.y}, ${end.x} ${end.y}`;
  }, [breadcrumb]);

  const safeCardPos = cardPos ?? { x: 18, y: 18, side: "right" as const };
  const transformOrigin = safeCardPos.side === "right" ? "0% 20%" : "100% 20%";

  return (
    <section ref={rootRef} className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />

      <AnimatePresence>
        {!activeVilla ? (
          <motion.div
            key="hud"
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-5 z-20 max-w-[min(420px,calc(100vw-2.5rem))] rounded-3xl border border-white/10 bg-black/35 px-4 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Carte interactive</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isReady ? `${points.length} villas` : "Calibration…"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">Survolez un point pour verrouiller une fiche.</p>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-[11px] text-white/70 ring-1 ring-white/10">
                HUD
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeVilla && breadcrumbPath ? (
          <motion.svg
            key="breadcrumb"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 hidden md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.path
              d={breadcrumbPath}
              fill="none"
              stroke="rgba(189, 146, 84, 0.55)"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ filter: "blur(4px)" }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            />
            <motion.path
              d={breadcrumbPath}
              fill="none"
              stroke="rgba(255, 255, 255, 0.36)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.34, ease: "easeOut", delay: 0.02 }}
            />
          </motion.svg>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeVilla ? (
          <motion.div
            key={activeVilla._id}
            ref={cardRef}
            onMouseEnter={cancelHoverClear}
            onMouseLeave={() => scheduleHoverClear(activeVilla._id)}
            style={{ left: safeCardPos.x, top: safeCardPos.y, transformOrigin }}
            className="absolute z-30 w-[360px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 shadow-[0_38px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl"
            initial={{ opacity: 0, y: 12, scale: 0.92, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(189,146,84,0.85),transparent)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_55%)] opacity-60" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)] bg-[length:100%_10px] opacity-[0.08]" />

              {activeVilla.imageUrl ? (
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                  <img
                    src={activeVilla.imageUrl}
                    alt={activeVilla.imageAlt || activeVilla.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute left-0 right-0 top-0 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                        Target locked
                      </p>
                      <p className="text-[11px] text-white/65">clic = ouvrir</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-lg font-semibold tracking-tight text-white">{activeVilla.name}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {activeVilla.city || activeVilla.region || activeVilla.country || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Target locked</p>
                    <p className="text-[11px] text-white/65">clic = ouvrir</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-white">{activeVilla.name}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {activeVilla.city || activeVilla.region || activeVilla.country || "—"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Users className="h-4 w-4" />
                    Pers.
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {typeof activeVilla.maxGuests === "number" ? activeVilla.maxGuests : "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <BedDouble className="h-4 w-4" />
                    Chambres
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {typeof activeVilla.bedrooms === "number" ? activeVilla.bedrooms : "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Bath className="h-4 w-4" />
                    SDB
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {typeof activeVilla.bathrooms === "number" ? activeVilla.bathrooms : "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Ruler className="h-4 w-4" />
                    m²
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {typeof activeVilla.surface === "number" ? activeVilla.surface : "—"}
                  </div>
                </div>
              </div>

              {resolveAmenityBadges(activeVilla.amenities).length ? (
                <div className="flex flex-wrap gap-2">
                  {resolveAmenityBadges(activeVilla.amenities).map(({ key, label, Icon }) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10"
                    >
                      <Icon className="h-4 w-4 text-white/80" />
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              {activeVilla.intro ? (
                <p className="text-sm leading-relaxed text-white/80">{truncate(activeVilla.intro, 180)}</p>
              ) : null}

              <button
                type="button"
                onClick={() => router.push(`/sites/${encodeURIComponent(activeVilla.slug)}`)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-white/90"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir la fiche
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
