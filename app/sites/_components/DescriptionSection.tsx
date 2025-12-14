// app/sites/_components/DescriptionSection.tsx

import type { Villa } from "./villa-types";

interface DescriptionSectionProps {
  villa: Villa;
}

export function DescriptionSection({ villa }: DescriptionSectionProps) {
  return (
    <section id="description" aria-labelledby="description-complete">
      <div className="space-y-4">
        <h2
          id="description-complete"
            className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
        >
          Description
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-slate-700">
          {villa.longDescription.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
