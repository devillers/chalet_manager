// app/sites/_components/FullGallerySection.tsx

import Image from "next/image";
import type { Villa } from "./villa-types";

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

interface FullGallerySectionProps {
  villa: Villa;
}

export function FullGallerySection({ villa }: FullGallerySectionProps) {
  const v = villa as unknown as Record<string, unknown>;

  const gallery = normalizeStringArray(v.gallery);
  const galleryAlt = normalizeStringArray(v.galleryAlt);
  const name = typeof v.name === "string" ? v.name : "Villa";

  if (gallery.length === 0) return null;

  return (
    <section id="galerie" aria-labelledby="galerie-immersive">
      <div className="mt-4 space-y-4 rounded-3xl bg-slate-900 px-4 py-6 text-slate-50 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="galerie-immersive"
              className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
            >
              Galerie photos
            </h2>
            <p className="mt-1 text-xs text-slate-200/80">
              Explorez chaque détail de la villa, de la terrasse à la dernière suite.
            </p>
          </div>

          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            {gallery.length} photos
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gallery.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`relative h-32 overflow-hidden rounded-2xl sm:h-36 md:h-40 ${
                index === 0 || index === 3 ? "sm:col-span-2" : ""
              }`}
            >
              <Image
                src={src}
                alt={galleryAlt[index] || name}
                fill
                unoptimized
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
