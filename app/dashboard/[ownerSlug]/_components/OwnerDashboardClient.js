"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import DrawerNav from "./DrawerNav";
import HomeView from "./views/HomeView";
import CalendarTimelineView from "./views/CalendarTimelineView";
import ReservationsTableView from "./views/ReservationsTableView";
import PropertiesView from "./views/PropertiesView";
import ContactView from "./views/ContactView";

/**
 * @typedef {"home"|"calendar"|"reservations"|"properties"|"contact"} ViewKey
 */

/**
 * @param {{
 *  owner: {slug:string,name:string},
 *  properties: Array<{id:string,name:string,city:string,websiteUrl:string}>,
 *  reservations: Array<{
 *    id:string,
 *    tenantFirstName:string, tenantLastName:string, phone:string, email:string,
 *    guestsCount:number, propertyId:string, propertyName:string,
 *    startDate:string, endDate:string, createdAt:string, amount:number
 *  }>,
 *  initialMessages: Array<{id:string,from:"admin"|"owner",body:string,createdAt:string}>,
 *  adminContact: {email:string,phone:string,hours:string}
 * }} props
 */
export default function OwnerDashboardClient({
  owner,
  properties,
  reservations,
  initialMessages,
  adminContact,
}) {
  /** @type {[ViewKey, Function]} */
  const [view, setView] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docked, setDocked] = useState(true);

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties?.[0]?.id || null
  );

  const [messages, setMessages] = useState(initialMessages || []);

  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  const isDesktop = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  }, []);

  // Keep docked on desktop by default, drawer overlay on mobile
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      if (mq.matches) {
        setDocked(true);
        setDrawerOpen(false);
      } else {
        setDocked(false);
      }
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // ESC to close overlay drawer
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (!docked && drawerOpen) setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, docked]);

  const effectiveDrawerVisible = docked || drawerOpen;
  const leftOffset = docked ? 304 : 0;

  function navigate(nextView) {
    setView(nextView);
    if (!docked) setDrawerOpen(false);
  }

  function openProperties(propertyId) {
    setSelectedPropertyId(propertyId);
    setView("properties");
    if (!docked) setDrawerOpen(false);
  }

  const headerTitle = useMemo(() => {
    const map = {
      home: "Dashboard",
      calendar: "Calendrier",
      reservations: "Réservations",
      properties: "Propriétés",
      contact: "Contact",
    };
    return map[view] || "Dashboard";
  }, [view]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-4">
          <motion.button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1">
              <span className="h-[2px] w-5 rounded bg-zinc-100/90" />
              <span className="h-[2px] w-5 rounded bg-zinc-100/70" />
              <span className="h-[2px] w-5 rounded bg-zinc-100/50" />
            </div>
          </motion.button>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-sm text-zinc-400">Owner: {owner?.slug}</div>
              <div className="truncate text-lg font-semibold tracking-tight">
                {owner?.name} · {headerTitle}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                  <span className="text-zinc-400">Accès :</span>{" "}
                  <span className="font-medium">{owner?.slug}</span>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <motion.button
                  type="button"
                  aria-label="Basculer mode dock"
                  onClick={() => {
                    setDocked((v) => {
                      const next = !v;
                      if (!next) setDrawerOpen(false);
                      return next;
                    });
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-zinc-300">Dock</span>
                  <span
                    className={`inline-flex h-6 w-10 items-center rounded-full border border-zinc-800 ${
                      docked ? "bg-amber-500/20" : "bg-zinc-950/60"
                    } p-1`}
                  >
                    <motion.span
                      className="h-4 w-4 rounded-full bg-zinc-100"
                      animate={{ x: docked ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  </span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative h-[calc(100vh-64px)]">
        <DrawerNav
          open={effectiveDrawerVisible}
          overlay={!docked}
          onClose={() => setDrawerOpen(false)}
          onNavigate={navigate}
          currentView={view}
          ownerName={owner?.name || "Owner"}
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={openProperties}
        />

        <div
          className="h-full"
          style={{
            paddingLeft: leftOffset ? `${leftOffset}px` : undefined,
          }}
        >
          <div className="mx-auto h-full max-w-[1600px] px-4">
            <div className="h-full py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
                  {view === "home" && (
                    <HomeView owner={owner} reservations={reservations} properties={properties} />
                  )}

                  {view === "calendar" && (
                    <CalendarTimelineView properties={properties} reservations={reservations} />
                  )}

                  {view === "reservations" && (
                    <ReservationsTableView reservations={reservations} />
                  )}

                  {view === "properties" && (
                    <PropertiesView
                      properties={properties}
                      selectedPropertyId={selectedPropertyId}
                      onSelectProperty={setSelectedPropertyId}
                      selectedProperty={selectedProperty}
                    />
                  )}

                  {view === "contact" && (
                    <ContactView
                      owner={owner}
                      messages={messages}
                      onSend={(body) => {
                        const nowIso = new Date().toISOString().slice(0, 10);
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `msg_${Date.now()}`,
                            from: "owner",
                            body,
                            createdAt: nowIso,
                          },
                        ]);
                      }}
                      adminContact={adminContact}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
