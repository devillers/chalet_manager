// app/carte/page.tsx
import { client } from "@/sanity/lib/client";
import { VILLAS_FOR_MAP_QUERY } from "@/sanity/lib/queries";
import { FranceMapClient } from "./FranceChaletMap";
import type { VillaMapPoint } from "./type";

export const revalidate = 60;

export default async function CartePage() {
  const villas = await client.fetch<VillaMapPoint[]>(VILLAS_FOR_MAP_QUERY);

  // Si aucune villa géolocalisée, on peut rendre un état vide minimal
  if (!villas || villas.length === 0) {
    return (
      <main className="min-h-[calc(100vh-0px)] bg-slate-950">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-10">
          <h1 className="text-2xl font-semibold text-white">Carte interactive</h1>
          <p className="mt-2 text-sm text-white/70">
            Aucune villa n’a encore de coordonnées GPS (champ <code className="rounded bg-white/10 px-1">location</code>).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-0px)] bg-slate-950">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Carte interactive
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Animation France → zoom, puis apparition des villas.
            </p>
          </div>
          <div className="hidden text-right text-xs text-white/60 md:block">
            {villas.length} villas
          </div>
        </div>

        <FranceMapClient villas={villas} />
      </div>
    </main>
  );
}
