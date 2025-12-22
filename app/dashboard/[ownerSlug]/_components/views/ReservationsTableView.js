"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

function formatRange(startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt.format(s)} → ${fmt.format(e)}`;
}

function formatISODate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * @param {{
 *  reservations: Array<{
 *    id:string,
 *    amount:number,
 *    guestsCount:number,
 *    startDate:string,
 *    endDate:string,
 *    createdAt:string,
 *    tenantFirstName:string,
 *    tenantLastName:string,
 *    phone:string,
 *    email:string,
 *    propertyName:string
 *  }>
 * }} props
 */
export default function ReservationsTableView({ reservations }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("startDate"); // startDate | amount
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const filteredSorted = useMemo(() => {
    const query = q.trim().toLowerCase();

    const rows = reservations.filter((r) => {
      if (!query) return true;
      const hay = [
        r.tenantFirstName,
        r.tenantLastName,
        r.email,
        r.propertyName,
        r.phone,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") {
        cmp = a.amount - b.amount;
      } else {
        cmp = new Date(a.startDate) - new Date(b.startDate);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [reservations, q, sortKey, sortDir]);

  function toggleSort(nextKey) {
    setSortKey((prev) => {
      if (prev === nextKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return nextKey;
    });
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-rows-[auto,1fr] gap-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Toutes les réservations</div>
              <div className="mt-1 text-xs text-zinc-400">
                Recherche (nom/email/propriété) + tri simple
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
                {filteredSorted.length} résultats
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => toggleSort("startDate")}
                  className={`h-10 rounded-xl border px-3 text-sm ${
                    sortKey === "startDate"
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Tri : date {sortKey === "startDate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => toggleSort("amount")}
                  className={`h-10 rounded-xl border px-3 text-sm ${
                    sortKey === "amount"
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Tri : montant {sortKey === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </motion.button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-zinc-400">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: martin, @example.com, Chalet…"
              className="mt-2 h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="h-full overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
                <div className="grid grid-cols-9 gap-0 px-4 py-3 text-xs text-zinc-400">
                  <div>Montant</div>
                  <div>Nb pers.</div>
                  <div>Dates réservation</div>
                  <div>Créée le</div>
                  <div>Nom</div>
                  <div>Prénom</div>
                  <div>Téléphone</div>
                  <div>Email</div>
                  <div>Propriété</div>
                </div>
              </div>

              <div className="h-[calc(100%-44px)] overflow-y-auto">
                {filteredSorted.map((r) => (
                  <motion.div
                    key={r.id}
                    className="grid grid-cols-9 gap-0 border-b border-zinc-800/60 px-4 py-3 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="font-semibold">{r.amount.toLocaleString("fr-FR")} €</div>
                    <div>{r.guestsCount}</div>
                    <div className="text-zinc-200">{formatRange(r.startDate, r.endDate)}</div>
                    <div className="text-zinc-300">{formatISODate(r.createdAt)}</div>
                    <div>{r.tenantLastName}</div>
                    <div>{r.tenantFirstName}</div>
                    <div className="text-zinc-300">{r.phone}</div>
                    <div className="truncate text-zinc-300">{r.email}</div>
                    <div className="truncate">{r.propertyName}</div>
                  </motion.div>
                ))}

                {filteredSorted.length === 0 && (
                  <div className="p-6 text-sm text-zinc-400">Aucun résultat.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
