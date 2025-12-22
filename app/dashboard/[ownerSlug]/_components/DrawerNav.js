"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

/**
 * @param {{
 *  open: boolean,
 *  overlay: boolean,
 *  onClose: () => void,
 *  onNavigate: (view: "home"|"calendar"|"reservations"|"properties"|"contact") => void,
 *  currentView: "home"|"calendar"|"reservations"|"properties"|"contact",
 *  ownerName: string,
 *  properties: Array<{id:string,name:string,city:string,websiteUrl:string}>,
 *  selectedPropertyId: string|null,
 *  onSelectProperty: (id: string) => void
 * }} props
 */
export default function DrawerNav({
  open,
  overlay,
  onClose,
  onNavigate,
  currentView,
  ownerName,
  properties,
  selectedPropertyId,
  onSelectProperty,
}) {
  const navItems = useMemo(
    () => [
      { key: "home", label: "Home" },
      { key: "calendar", label: "Calendrier" },
      { key: "reservations", label: "Reservations" },
      { key: "properties", label: "Proprietes" },
      { key: "contact", label: "Contact" },
    ],
    []
  );

  const containerClass = overlay
    ? "fixed inset-y-0 left-0 z-50"
    : "absolute inset-y-0 left-0 z-10";

  const widthPx = 304;

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {overlay && open && (
          <motion.button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-40 cursor-default bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className={containerClass}
            role="navigation"
            aria-label="Menu Owner Portal"
            initial={overlay ? { x: -widthPx, opacity: 1 } : { x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={overlay ? { x: -widthPx, opacity: 1 } : { x: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            style={{ width: `${widthPx}px` }}
          >
            <div className="h-full border-r border-zinc-800/70 bg-zinc-950/70 backdrop-blur">
              <div className="flex h-16 items-center justify-between gap-2 px-4">
                <div className="min-w-0">
                  <div className="truncate text-xs text-zinc-400">Owner Portal</div>
                  <div className="truncate text-sm font-semibold">{ownerName}</div>
                </div>

                {overlay && (
                  <motion.button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-lg leading-none">×</span>
                  </motion.button>
                )}
              </div>

              <div className="h-[calc(100%-64px)] overflow-y-auto px-3 pb-4">
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const active = currentView === item.key;
                    return (
                      <motion.button
                        key={item.key}
                        type="button"
                        onClick={() => onNavigate(item.key)}
                        aria-current={active ? "page" : undefined}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                          active
                            ? "border-amber-500/40 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-900/40"
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <span className="text-sm font-medium text-zinc-100">{item.label}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            active ? "bg-amber-400" : "bg-zinc-700"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="text-xs font-semibold text-zinc-200">Propriétés</div>
                  <div className="mt-2 space-y-1">
                    {properties.map((p) => {
                      const active = p.id === selectedPropertyId;
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectProperty(p.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                            active
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-zinc-800 bg-zinc-900/40"
                          }`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{p.name}</div>
                            <div className="truncate text-xs text-zinc-400">{p.city}</div>
                          </div>
                          <span className="ml-3 text-xs text-zinc-400">↗</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="text-xs text-zinc-400">
                    Astuce : <span className="text-zinc-200">ESC</span> ferme le menu (mode tiroir).
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
