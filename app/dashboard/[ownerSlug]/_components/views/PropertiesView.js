"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * @param {{
 *  properties: Array<{id:string,name:string,city:string,websiteUrl:string}>,
 *  selectedPropertyId: string|null,
 *  onSelectProperty: (id: string) => void,
 *  selectedProperty: {id:string,name:string,city:string,websiteUrl:string}|null
 * }} props
 */
export default function PropertiesView({
  properties,
  selectedPropertyId,
  onSelectProperty,
  selectedProperty,
}) {
  const selected = useMemo(() => selectedProperty, [selectedProperty]);

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px,1fr]">
        {/* List */}
        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="text-sm font-semibold">Vos propriétés</div>
            <div className="mt-1 text-xs text-zinc-400">
              Sélectionnez une propriété pour afficher son site dans le dashboard.
            </div>
          </div>

          <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
            <div className="space-y-3">
              {properties.map((p) => {
                const active = p.id === selectedPropertyId;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProperty(p.id)}
                    className={`w-full rounded-3xl border p-4 text-left ${
                      active
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-zinc-800 bg-zinc-950/30"
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        <div className="mt-1 truncate text-xs text-zinc-400">{p.city}</div>
                      </div>
                      <span className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-200">
                        Site
                      </span>
                    </div>

                    <div className="mt-3 truncate text-xs text-zinc-500">{p.websiteUrl}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Viewer */}
        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {selected ? selected.name : "Sélectionnez une propriété"}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                Affichage via iframe (mock URL).
              </div>
            </div>

            {selected && (
              <motion.a
                href={selected.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Ouvrir dans un nouvel onglet ↗
              </motion.a>
            )}
          </div>

          <div className="h-[calc(100%-65px)] overflow-hidden">
            {selected ? (
              <iframe
                title={`Site de ${selected.name}`}
                src={selected.websiteUrl}
                className="h-full w-full"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                Aucune propriété sélectionnée.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
