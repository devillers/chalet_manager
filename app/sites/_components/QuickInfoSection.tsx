// app/sites/_components/QuickInfoSection.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Villa } from "./villa-types";
import { normalizeStringArray } from "./villa-helpers";
interface QuickInfoSectionProps {
  villa: Villa;
}

export function QuickInfoSection({ villa }: QuickInfoSectionProps) {
  const shortDescription =
    typeof (villa as any).shortDescription === "string" ? (villa as any).shortDescription : "";

  const quickHighlights = normalizeStringArray((villa as any).quickHighlights);
  const keyAmenities = normalizeStringArray((villa as any).keyAmenities);

  const hasTop = shortDescription || quickHighlights.length > 0;
  const hasIncontournables = keyAmenities.length > 0;

  if (!hasTop && !hasIncontournables) return null;

  return (
    <section aria-labelledby="info-rapide">
      {hasTop ? (
        <div className="space-y-4 border-b border-slate-200 pb-6">
          <h2
            id="info-rapide"
            className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-700"
          >
            Votre séjour à la {villa.name}
          </h2>

          {shortDescription ? (
            <p className="text-[13px] text-justify leading-7 text-slate-500">
              {shortDescription}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {quickHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                {quickHighlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <Link
              href="#description"
              className="inline-flex items-center gap-1 text-[10px] font-medium uppercase text-[#bd9254] hover:text-[#bd9254]"
            >
              voir
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {hasIncontournables ? (
        <div className="mt-6 space-y-3">
          <h3 className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500">
            Les incontournables
          </h3>
          <div className="flex flex-wrap gap-2">
            {keyAmenities.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
