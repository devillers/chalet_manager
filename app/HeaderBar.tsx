// app/sites/_components/HeaderBar.tsx

import Link from "next/link";
//import { Phone } from "lucide-react";

export function HeaderBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/20 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-[0.35em] uppercase">
            C 
          </span>
          <span className="text-xs font-light tracking-[0.35em] uppercase text-amber-700">
            M
          </span>
        </Link>

        {/* Menu principal */}
        <nav className="hidden items-center gap-6 text-xs font-medium uppercase tracking-[0.2em] text-slate-700 md:flex">
          <Link href="/" className="hover:text-amber-700 transition-colors">
            Destinations
          </Link>
          <Link href="/" className="hover:text-amber-700 transition-colors">
            Villas
          </Link>
          <Link href="/" className="hover:text-amber-700 transition-colors">
            Expériences
          </Link>
          <Link href="/" className="hover:text-amber-700 transition-colors">
            Conciergerie
          </Link>
        </nav>

        {/* Recherche + langue/devise + téléphone */}
        <div className="flex flex-1 items-center justify-end gap-3">
          {/* Barre de recherche */}
          <form className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] shadow-sm md:flex">
            <button type="button" className="flex items-center gap-1 text-slate-500">
              <span>Destination</span>
            </button>
            <span className="h-4 w-px bg-slate-200" />
            <button type="button" className="flex items-center gap-1 text-slate-500">
              <span>Dates</span>
            </button>
            <span className="h-4 w-px bg-slate-200" />
            <button type="button" className="flex items-center gap-1 text-slate-500">
              <span>Voyageurs</span>
            </button>
            <button
              type="submit"
              className="ml-2 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-amber-800 transition"
            >
              Rechercher
            </button>
          </form>

          {/* Langue / devise */}
          <button className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-slate-700 hover:text-amber-700 md:inline-flex">
            FR / EUR
          </button>

          {/* Téléphone cliquable */}
       
        </div>
      </div>
    </header>
  );
}
