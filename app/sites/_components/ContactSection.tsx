// app/sites/_components/ContactSection.tsx

import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import type { Villa } from "./villa-types";

interface ContactSectionProps {
  villa: Villa;
}

export function ContactSection({ villa }: ContactSectionProps) {
  return (
    <section aria-labelledby="contact-humain">
      <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="contact-humain"
                className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500 mb-4"
            >
              Des questions   ?
            </h2>
            <p className="text-sm italic text-slate-700">
              Échangez avec un conseiller dédié pour affiner votre séjour, vos dates ou
              vos envies.
            </p>
            <p className="text-xs text-slate-500">
              Disponibles du lundi au samedi, 9h–19h (heure de Paris).
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white hover:bg-amber-800 transition"
            >
              Planifier un appel
              <ArrowUpRight className="h-3 w-3" />
            </Link>
            <Link
              href="tel:+33400000000"
              className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-700 hover:text-amber-800"
            >
              <Phone className="h-3 w-3" />
              <span>+33 (0)4 00 00 00 00</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
