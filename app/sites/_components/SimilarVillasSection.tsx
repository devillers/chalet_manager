// app/sites/_components/SimilarVillasSection.tsx

import Link from "next/link";
import Image from "next/image";
import type { Villa } from "./villa-types";

function normalizeArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function SimilarVillasSection({ villa }: { villa: Villa }) {
  const v = villa as unknown as Record<string, unknown>;
  const similar = normalizeArray<any>(v.similarVillas);

  if (!similar.length) return null;

  return (
    <section aria-labelledby="similaires" className="space-y-4">
      <h2
        id="similaires"
        className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
      >
        Recommandées pour vous
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {similar.map((item, index) => {
          const href =
            typeof item?.slug === "string"
              ? `/sites/${item.slug}`
              : typeof item?.id === "string"
                ? `/sites/${item.id}`
                : "#";

          const key = item?.key ?? item?.id ?? `${item?.slug ?? "item"}-${index}`;

          const image = typeof item?.image === "string" ? item.image : "";
          const name = typeof item?.name === "string" ? item.name : "Villa";
          const location = typeof item?.location === "string" ? item.location : "";
          const capacityLabel = typeof item?.capacityLabel === "string" ? item.capacityLabel : "";
          const extraPersonsBadge =
            typeof item?.extraPersonsBadge === "string" ? item.extraPersonsBadge : "";
          const periodSuggestion =
            typeof item?.periodSuggestion === "string" ? item.periodSuggestion : "";

          return (
            <Link
              key={key}
              href={href}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 w-full overflow-hidden">
                {image ? (
                  <Image
                    src={image}
                    alt={name}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-100" />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="space-y-1">
                  {location ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {location}
                    </p>
                  ) : null}
                  <p className="text-sm font-medium text-slate-900">{name}</p>
                </div>

                {capacityLabel ? (
                  <p className="text-xs text-slate-600">{capacityLabel}</p>
                ) : null}

                {(extraPersonsBadge || periodSuggestion) ? (
                  <div className="mt-auto space-y-1 pt-2">
                    {extraPersonsBadge ? (
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                        {extraPersonsBadge}
                      </span>
                    ) : null}
                    {periodSuggestion ? (
                      <p className="text-[11px] text-slate-600">{periodSuggestion}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
