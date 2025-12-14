// app/sites/_components/EquipmentsSection.tsx

import type { Villa } from "./villa-types";

interface EquipmentsSectionProps {
  villa: Villa;
}

export function EquipmentsSection({ villa }: EquipmentsSectionProps) {
  return (
    <section id="equipements" aria-labelledby="equipements-titre">
      <div className="space-y-4">
        <h2
          id="equipements-titre"
          className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
        >
          Équipements de la villa
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {villa.keyAmenities.map((amenity) => (
            <div
              key={amenity}
              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-slate-100"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-700" />
              <span>{amenity}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
