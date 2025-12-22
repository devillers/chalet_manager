"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

function formatFRDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatShort(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(d);
}

function daysBetween(isoStart, isoEnd) {
  const s = new Date(isoStart);
  const e = new Date(isoEnd);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * @param {{
 *  owner: {slug:string,name:string},
 *  properties: Array<{id:string,name:string,city:string,websiteUrl:string}>,
 *  reservations: Array<{
 *    id:string, tenantFirstName:string, tenantLastName:string,
 *    guestsCount:number, propertyName:string, startDate:string, endDate:string, amount:number
 *  }>
 * }} props
 */
export default function HomeView({ owner, properties, reservations }) {
  const today = useMemo(() => new Date(), []);

  const upcoming = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return [...reservations]
      .filter((r) => new Date(r.endDate).getTime() >= startOfToday.getTime())
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 8);
  }, [reservations]);

  const summaryCount = useMemo(() => {
    const now = new Date();
    return reservations.filter((r) => new Date(r.endDate) >= now).length;
  }, [reservations]);

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-rows-[auto,1fr] gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div
            className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="text-xs text-zinc-400">Aujourd’hui</div>
            <div className="mt-1 text-lg font-semibold capitalize">{formatFRDate(today)}</div>
            <div className="mt-4 text-sm text-zinc-300">
              <span className="text-zinc-400">Owner :</span>{" "}
              <span className="font-medium">{owner?.name}</span>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: 0.04 }}
          >
            <div className="text-xs text-zinc-400">Résumé</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">{summaryCount}</div>
            <div className="mt-1 text-sm text-zinc-300">réservations à venir</div>
            <div className="mt-4 text-xs text-zinc-400">
              Propriétés : <span className="text-zinc-200">{properties.length}</span>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: 0.08 }}
          >
            <div className="text-xs text-zinc-400">Prochaine arrivée</div>
            {upcoming[0] ? (
              <>
                <div className="mt-1 text-lg font-semibold">
                  {upcoming[0].tenantFirstName} {upcoming[0].tenantLastName}
                </div>
                <div className="mt-1 text-sm text-zinc-300">
                  {upcoming[0].propertyName}
                </div>
                <div className="mt-3 text-xs text-zinc-400">
                  {formatShort(upcoming[0].startDate)} → {formatShort(upcoming[0].endDate)} ·{" "}
                  {daysBetween(upcoming[0].startDate, upcoming[0].endDate)} nuits
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-zinc-400">Aucune réservation à venir.</div>
            )}
          </motion.div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Réservations à venir</div>
              <div className="text-xs text-zinc-400">Aperçu des prochaines réservations</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
              {upcoming.length} affichées
            </div>
          </div>

          <div className="h-[calc(100%-65px)] overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {upcoming.map((r) => (
                <motion.div
                  key={r.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {r.tenantFirstName} {r.tenantLastName}
                      </div>
                      <div className="mt-1 truncate text-xs text-zinc-400">{r.propertyName}</div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-200">
                      {r.guestsCount} pers.
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <span className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-1">
                      {formatShort(r.startDate)} → {formatShort(r.endDate)}
                    </span>
                    <span className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-1">
                      {r.amount.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                </motion.div>
              ))}

              {upcoming.length === 0 && (
                <div className="text-sm text-zinc-400">Aucune réservation à afficher.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
