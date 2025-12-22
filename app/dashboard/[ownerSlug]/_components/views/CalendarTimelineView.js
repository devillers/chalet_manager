"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function formatDayLabel(d) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(d);
}

/**
 * @param {{
 *  properties: Array<{id:string,name:string,city:string,websiteUrl:string}>,
 *  reservations: Array<{
 *    id:string, propertyId:string, propertyName:string,
 *    startDate:string, endDate:string, amount:number, guestsCount:number
 *  }>
 * }} props
 */
export default function CalendarTimelineView({ properties, reservations }) {
  const dayWidth = 72;
  const daysSpan = 31;

  const windowStart = useMemo(() => startOfDay(new Date()), []);
  const windowEnd = useMemo(() => addDays(windowStart, daysSpan - 1), [windowStart]);

  const days = useMemo(() => {
    return Array.from({ length: daysSpan }).map((_, i) => addDays(windowStart, i));
  }, [windowStart]);

  const totalWidth = useMemo(() => dayWidth * daysSpan, [dayWidth]);

  const byProperty = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => map.set(p.id, []));
    reservations.forEach((r) => {
      if (!map.has(r.propertyId)) map.set(r.propertyId, []);
      map.get(r.propertyId).push(r);
    });
    // sort per property by start
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      map.set(k, arr);
    }
    return map;
  }, [properties, reservations]);

  function calcBar(r) {
    const rs = startOfDay(new Date(r.startDate));
    const re = startOfDay(new Date(r.endDate));

    const startIdx = Math.round((rs - windowStart) / (1000 * 60 * 60 * 24));
    const endIdx = Math.round((re - windowStart) / (1000 * 60 * 60 * 24));

    const leftDays = clamp(startIdx, 0, daysSpan - 1);
    const rightDays = clamp(endIdx, 0, daysSpan);

    const widthDays = Math.max(1, rightDays - leftDays);

    return {
      left: leftDays * dayWidth,
      width: widthDays * dayWidth,
      clipped: startIdx < 0 || endIdx > daysSpan,
    };
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-rows-[auto,1fr] gap-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Timeline par propriété</div>
              <div className="mt-1 text-xs text-zinc-400">
                Fenêtre : {formatDayLabel(windowStart)} → {formatDayLabel(windowEnd)} (scroll
                horizontal)
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
              {properties.length} propriétés · {reservations.length} réservations
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="h-full overflow-hidden">
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div style={{ minWidth: totalWidth + 360 }}>
                {/* Header row */}
                <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
                  <div className="flex">
                    <div className="w-[360px] flex-none border-r border-zinc-800 px-5 py-3">
                      <div className="text-xs text-zinc-400">Propriété</div>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-12">
                        {days.map((d, i) => (
                          <div
                            key={i}
                            className="absolute top-0 h-full border-l border-zinc-800/60"
                            style={{ left: i * dayWidth, width: dayWidth }}
                          >
                            <div className="px-2 py-3 text-xs text-zinc-400">
                              {formatDayLabel(d)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rows */}
                <div className="h-[calc(100%-48px)] overflow-y-auto">
                  {properties.map((p) => {
                    const list = byProperty.get(p.id) || [];
                    return (
                      <div key={p.id} className="flex border-b border-zinc-800/60">
                        <div className="w-[360px] flex-none border-r border-zinc-800 px-5 py-4">
                          <div className="text-sm font-semibold">{p.name}</div>
                          <div className="mt-1 text-xs text-zinc-400">{p.city}</div>
                        </div>

                        <div className="relative flex-1">
                          <div className="relative h-[84px]">
                            {/* day grid lines */}
                            {days.map((_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 h-full border-l border-zinc-800/40"
                                style={{ left: i * dayWidth }}
                              />
                            ))}

                            {list.map((r) => {
                              const bar = calcBar(r);
                              const title = `${r.propertyName} · ${r.amount.toLocaleString(
                                "fr-FR"
                              )} € · ${r.guestsCount} pers. · ${r.startDate} → ${r.endDate}`;
                              return (
                                <motion.div
                                  key={r.id}
                                  className="absolute top-6 h-10 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                                  style={{ left: bar.left, width: bar.width }}
                                  title={title}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  whileHover={{ y: -1, scale: 1.01 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-xs font-semibold text-zinc-100">
                                      {r.amount.toLocaleString("fr-FR")} €
                                    </div>
                                    <div className="text-xs text-zinc-300">{r.guestsCount}p</div>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {list.length === 0 && (
                              <div className="absolute left-4 top-7 text-xs text-zinc-500">
                                Aucune réservation dans la fenêtre.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-zinc-800 bg-zinc-950/40 px-5 py-3 text-xs text-zinc-400">
                  Sur mobile : scrollez horizontalement la timeline.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
