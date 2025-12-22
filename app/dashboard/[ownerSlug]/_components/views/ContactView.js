"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

function formatMsgDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(d);
}

/**
 * @param {{
 *  owner: {slug:string,name:string},
 *  messages: Array<{id:string,from:"admin"|"owner",body:string,createdAt:string}>,
 *  onSend: (body: string) => void,
 *  adminContact: {email:string,phone:string,hours:string}
 * }} props
 */
export default function ContactView({ owner, messages, onSend, adminContact }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  const grouped = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [grouped.length]);

  function submit() {
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText("");
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr,380px]">
        {/* Thread */}
        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="text-sm font-semibold">Messagerie</div>
            <div className="mt-1 text-xs text-zinc-400">
              Fil de discussion entre Admin et {owner?.name}
            </div>
          </div>

          <div className="grid h-[calc(100%-65px)] grid-rows-[1fr,auto]">
            <div ref={listRef} className="min-h-0 overflow-y-auto p-5">
              <div className="space-y-3">
                {grouped.map((m) => {
                  const mine = m.from === "owner";
                  return (
                    <motion.div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.14 }}
                    >
                      <div
                        className={`max-w-[85%] rounded-3xl border px-4 py-3 text-sm ${
                          mine
                            ? "border-amber-500/30 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-950/30"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-xs text-zinc-400">
                            {mine ? "Vous" : "Admin"} · {formatMsgDate(m.createdAt)}
                          </div>
                        </div>
                        <div className="whitespace-pre-wrap text-zinc-100">{m.body}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-zinc-800 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder="Écrire un message… (Ctrl/⌘ + Enter pour envoyer)"
                  className="h-11 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 text-sm outline-none"
                />
                <motion.button
                  type="button"
                  onClick={submit}
                  aria-label="Envoyer le message"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 text-sm font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Envoyer
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin contact */}
        <div className="min-h-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="text-sm font-semibold">Contact Admin</div>
            <div className="mt-1 text-xs text-zinc-400">Coordonnées & horaires</div>
          </div>

          <div className="h-[calc(100%-65px)] overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-400">Email</div>
                <div className="mt-1 text-sm font-semibold">{adminContact.email}</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-400">Téléphone</div>
                <div className="mt-1 text-sm font-semibold">{adminContact.phone}</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
                <div className="text-xs text-zinc-400">Horaires</div>
                <div className="mt-1 text-sm font-semibold">{adminContact.hours}</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4 text-xs text-zinc-400">
                Messages conservés côté UI (mock). Prêt à brancher une API (GET/POST) plus tard.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
