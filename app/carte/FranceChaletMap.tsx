// app/carte/FranceChaletMap.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  X,
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

const CARD_FALLBACK_WIDTH = 392;
const CARD_FALLBACK_HEIGHT = 420;

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

    indices.sort((a, b) =>
      projected[a].villa.slug.localeCompare(projected[b].villa.slug)
    );

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

const AMENITY_PRESETS = [
  {
    key: "jacuzzi",
    label: "Jacuzzi",
    Icon: Sparkles,
    match: ["jacuzzi", "spa", "hot tub", "bain bouillonnant"],
  },
  { key: "sauna", label: "Sauna", Icon: Flame, match: ["sauna"] },
  { key: "piscine", label: "Piscine", Icon: Waves, match: ["piscine", "pool"] },
  {
    key: "hammam",
    label: "Hammam",
    Icon: CloudFog,
    match: ["hammam", "steam"],
  },
  {
    key: "cinema",
    label: "Cinéma",
    Icon: Film,
    match: ["cinema", "home cinema", "salle cinema", "movie"],
  },
] as const;

function resolveAmenityBadges(amenities?: string[]) {
  const normalized = (amenities ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return AMENITY_PRESETS.filter((preset) =>
    preset.match.some((needle) =>
      normalized.some((value) => value.includes(needle))
    )
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

function computeFixedCardPlacement(
  rootSize: { width: number; height: number },
  hudBottom: number,
  cardSize: { width: number; height: number }
): CardPlacement {
  const margin = 16;

  // Mobile: bottom sheet-ish, centered.
  if (rootSize.width < 768) {
    const width = Math.min(cardSize.width, rootSize.width - margin * 2);
    const height = Math.min(
      cardSize.height,
      Math.max(260, rootSize.height - Math.max(hudBottom + 16, 90) - margin * 2)
    );
    const x = Math.round((rootSize.width - width) / 2);
    const y = Math.round(
      clamp(rootSize.height - height - margin, hudBottom + 12, rootSize.height)
    );
    return { x, y, side: "left" };
  }

  // Desktop: fixed “briefing area” left.
  const height = Math.min(
    cardSize.height,
    Math.max(300, rootSize.height - margin * 2)
  );
  const side: CardPlacement["side"] = "left";
  const x = Math.round(clamp(rootSize.width * 0.06, margin, 128));
  const minTop = Math.max(margin, Math.round(hudBottom + 16));
  const y = clamp(
    (rootSize.height - height) / 2,
    minTop,
    rootSize.height - height - margin
  );

  return { x, y, side };
}

export function FranceChaletMap({ villas }: Props) {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const tokenError = token
    ? null
    : "Token Mapbox manquant (NEXT_PUBLIC_MAPBOX_TOKEN).";

  const rootRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const offsetsRef = useRef<Map<string, mapboxgl.PointLike>>(new Map());

  const hoverClearTimeoutRef = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<CardPlacement | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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
      }, 900);
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

  const amenityBadges = useMemo(() => {
    if (!activeVilla) return [];
    return resolveAmenityBadges(activeVilla.amenities);
  }, [activeVilla]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  }, []);

  const primeOverlayPlacement = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const hudRect = hudRef.current?.getBoundingClientRect();
    const hudBottom = hudRect ? hudRect.bottom - rootRect.top : 0;
    setCardPos(
      computeFixedCardPlacement(
        { width: rootRect.width, height: rootRect.height },
        hudBottom,
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
          primeOverlayPlacement();
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

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "center",
          offset,
        })
          .setLngLat([villa.lng, villa.lat])
          .addTo(map);

        window.setTimeout(() => el.classList.add("is-visible"), 220 + idx * 90);

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
        padding: { top: 150, left: 48, right: 48, bottom: 48 },
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

    const handleMapError = (evt: unknown) => {
      const message =
        (evt as { error?: unknown } | null | undefined)?.error instanceof Error
          ? ((evt as { error: Error }).error.message ?? null)
          : typeof (evt as { error?: unknown } | null | undefined)?.error ===
              "string"
            ? String((evt as { error?: unknown }).error)
            : null;
      if (!message) return;
      if (cancelled) return;
      setMapError((prev) => prev ?? message);
    };

    map.on("error", handleMapError);

    const forceResize = () => {
      try {
        map.resize();
      } catch {}
    };

    forceResize();
    window.requestAnimationFrame(forceResize);
    window.setTimeout(forceResize, 120);

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
        pitch: 34,
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
      map.off("error", handleMapError);
      clearMarkers();
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [
    activateVilla,
    cancelHoverClear,
    points,
    prefersReducedMotion,
    primeOverlayPlacement,
    router,
    scheduleHoverClear,
    token,
  ]);

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
        const hudRect = hudRef.current?.getBoundingClientRect();
        const hudBottom = hudRect ? hudRect.bottom - rootRect.top : 0;

        const projected = map.project([activeVilla.lng, activeVilla.lat]);
        const [ox, oy] = toOffsetTuple(offsetsRef.current.get(activeVilla._id));

        const anchorX = mapRect.left - rootRect.left + projected.x + ox;
        const anchorY = mapRect.top - rootRect.top + projected.y + oy;

        const placement = computeFixedCardPlacement(
          { width: rootRect.width, height: rootRect.height },
          hudBottom,
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

        const endX =
          placement.side === "right"
            ? placement.x
            : placement.x + cardRect.width;
        const endY = placement.y + cardRect.height / 2;

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
          return {
            start: { x: anchorX, y: anchorY },
            end: { x: endX, y: endY },
          };
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
    return `M ${start.x} ${start.y} C ${start.x + dir * dx} ${start.y}, ${
      end.x - dir * dx
    } ${end.y}, ${end.x} ${end.y}`;
  }, [breadcrumb]);

  const safeCardPos = cardPos ?? { x: 18, y: 120, side: "left" as const };
  const transformOrigin = safeCardPos.side === "right" ? "100% 50%" : "0% 50%";

  return (
    <section
      ref={rootRef}
      className="relative h-screen w-screen overflow-hidden bg-slate-950"
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Vignette + subtle glow */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-black/10 to-black/10" />
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#bd9254]/12 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[460px] w-[460px] rounded-full bg-white/8 blur-3xl" />
      </div>

      {/* HUD */}
      <motion.div
        ref={hudRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-4 z-20 w-[min(460px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-black/35 px-4 py-3 shadow-[0_18px_70px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Carte interactive
            </p>

            <div className="mt-1 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#bd9254]/80 shadow-[0_0_0_6px_rgba(189,146,84,0.12)]" />
              <p className="truncate text-sm font-semibold text-white">
                {isReady
                  ? `${points.length} villas disponibles`
                  : "Calibration…"}
              </p>
            </div>

            <p className="mt-1 text-[11px] leading-relaxed text-white/70">
              Survolez un point pour afficher la fiche. Cliquez pour ouvrir la
              page villa.
            </p>

            {tokenError || mapError ? (
              <p className="mt-2 text-[11px] text-rose-200">
                Mapbox:{" "}
                <span className="text-white/90">{tokenError ?? mapError}</span>
              </p>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb (desktop only) */}

      {/* Card */}
      <AnimatePresence mode="wait">
        {activeVilla ? (
          <motion.div
            key={activeVilla._id}
            ref={cardRef}
            onMouseEnter={cancelHoverClear}
            onMouseLeave={() => scheduleHoverClear(activeVilla._id)}
            style={{ left: safeCardPos.x, top: safeCardPos.y, transformOrigin }}
            className={[
              "absolute z-30",
              "w-[min(392px,calc(100vw-2rem))]",
              "max-h-[calc(100vh-2rem)]",
              "overflow-hidden rounded-xl",
              "border border-white/12 bg-black/50",
              "shadow-[0_26px_90px_-28px_rgba(0,0,0,0.85)] backdrop-blur-2xl",
            ].join(" ")}
            initial={{ opacity: 0, y: 10, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Top media */}
            {/* Top media (full-bleed) */}
            <div className="relative">
              <div className="relative aspect-[16/10] w-full">
                {activeVilla.imageUrl ? (
                  <>
                    <Image
                      src={activeVilla.imageUrl}
                      alt={activeVilla.imageAlt || activeVilla.name}
                      fill
                      sizes="(max-width: 768px) 92vw, 392px"
                      className="object-cover"
                      priority={false}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
                )}

                {/* <button
                  type="button"
                  onClick={() => {
                    setActiveId(null);
                    setCardPos(null);
                    setBreadcrumb(null);
                  }}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/85 backdrop-blur hover:bg-black/50"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button> */}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[50px] font-thin tracking-tight text-white">
                    {activeVilla.name}
                  </p>
                  <p className="mt-0.5 text-[12px] font-light uppercase text-white/70">
                    {activeVilla.city ||
                      activeVilla.region ||
                      activeVilla.country ||
                      "—"}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-center gap-2 text-[30px] text-white/55">
                        <Users className="h-5 w-5 font-light text-white" />
                        <div className="mt-1 text-sm font-semibold text-white">
                          {typeof activeVilla.maxGuests === "number"
                            ? activeVilla.maxGuests
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-center gap-2 text-[30px] text-white/55">
                        <BedDouble className="h-5 w-5 text-white" />
                        <div className="mt-1 text-sm font-semibold text-white">
                          {typeof activeVilla.bedrooms === "number"
                            ? activeVilla.bedrooms
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-center gap-2 text-[30px] text-white/55">
                        <Bath className="h-5 w-5 text-white" />
                        <div className="mt-1 text-sm font-semibold text-white">
                          {typeof activeVilla.bathrooms === "number"
                            ? activeVilla.bathrooms
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-center gap-2 text-[30px] text-white/55">
                        <Ruler className="h-5 w-5 text-white" />
                        <div className="mt-1 text-sm font-semibold text-white">
                          {typeof activeVilla.surface === "number"
                            ? `${activeVilla.surface} m²`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {amenityBadges.length ? (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {amenityBadges.map(({ key, label, Icon }) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/80"
                    >
                      <Icon className="h-4 w-4 text-white" />
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              {activeVilla.intro ? (
                <p className="mt-3 text-[12px] leading-relaxed text-white/70">
                  {truncate(activeVilla.intro, 190)}
                </p>
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/sites/${encodeURIComponent(activeVilla.slug)}`
                    )
                  }
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-[#bd9254]/35 bg-gradient-to-b from-[#bd9254]/22 to-[#bd9254]/10 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_50px_-24px_rgba(189,146,84,0.55)] hover:border-[#bd9254]/55 hover:from-[#bd9254]/26 hover:to-[#bd9254]/12"
                >
                  Voir la villa
                  <ExternalLink className="h-4 w-4 text-white/85 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Marker styles (self-contained) */}
      <style jsx global>{`
        .chalet-marker {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          position: relative;
          transform: scale(0.72);
          opacity: 0;
          transition:
            transform 220ms ease,
            opacity 220ms ease,
            filter 220ms ease;
          cursor: pointer;
          outline: none;
        }

        .chalet-marker.is-visible {
          opacity: 1;
          transform: scale(1);
        }

        .chalet-marker::before {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 9999px;
          background: rgba(189, 146, 84, 0.18);
          filter: blur(0px);
          opacity: 0.9;
          transform: scale(0.65);
          transition:
            transform 220ms ease,
            opacity 220ms ease;
        }

        .chalet-marker::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(189, 146, 84, 0.95);
          box-shadow:
            0 10px 28px rgba(0, 0, 0, 0.35),
            0 0 0 4px rgba(255, 255, 255, 0.35);
          transition:
            transform 220ms ease,
            box-shadow 220ms ease;
        }

        .chalet-marker:hover,
        .chalet-marker:focus-visible {
          filter: brightness(1.08);
        }

        .chalet-marker:hover::before,
        .chalet-marker:focus-visible::before {
          transform: scale(1);
          opacity: 1;
        }

        .chalet-marker.is-active::after {
          transform: scale(1.08);
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.45),
            0 0 0 5px rgba(255, 255, 255, 0.45);
        }

        .chalet-marker.is-active::before {
          transform: scale(1.08);
          opacity: 1;
        }
      `}</style>
    </section>
  );
}
