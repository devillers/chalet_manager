// app/sites/_components/InfoBlocksSection.tsx

import { Info, Calendar } from "lucide-react";
import type { Villa } from "./villa-types";

interface InfoBlocksSectionProps {
  villa: Villa;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0);
}

export function InfoBlocksSection({ villa }: InfoBlocksSectionProps) {
  // Tolérant aux types “pas parfaitement alignés”
  const v = villa as unknown as Record<string, unknown>;

  const goodToKnow = normalizeStringArray(v.goodToKnow);
  const conciergeSubtitle = isNonEmptyString(v.conciergeSubtitle) ? v.conciergeSubtitle.trim() : "";
  const conciergePoints = normalizeStringArray(v.conciergePoints);
  const extraInfo = normalizeStringArray(v.extraInfo);

  const hasGoodToKnow = goodToKnow.length > 0;
  const hasConcierge = conciergePoints.length > 0 || conciergeSubtitle.length > 0;
  const hasExtraInfo = extraInfo.length > 0;

  // Si rien à afficher -> rien
  if (!hasGoodToKnow && !hasConcierge && !hasExtraInfo) return null;

  return (
    <section aria-labelledby="info-cle">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bon à savoir */}
        {hasGoodToKnow ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-800" aria-hidden="true" />
              <h3 className="text-xs font-light uppercase text-slate-600">
                Bon à savoir
              </h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-700">
              {goodToKnow.map((item, idx) => (
                <li key={`${item}-${idx}`} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        {/* Conciergerie incluse */}
        {hasConcierge ? (
          <div className="space-y-3 rounded-2xl bg-slate-900 px-4 py-5 text-slate-50 shadow-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-xs font-light uppercase text-slate-200">
                Conciergerie incluse
              </h3>
            </div>

            {conciergeSubtitle ? (
              <p className="text-xs text-slate-100/80">{conciergeSubtitle}</p>
            ) : null}

            {conciergePoints.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-100/90">
                {conciergePoints.map((point, idx) => (
                  <li key={`${point}-${idx}`} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        {/* Informations */}
        {hasExtraInfo ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-800" aria-hidden="true" />
              <h3 className="text-xs font-light uppercase text-slate-600">
                Informations
              </h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-700">
              {extraInfo.map((info, idx) => (
                <li key={`${info}-${idx}`} className="leading-relaxed">
                  {info}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </section>
  );
}
