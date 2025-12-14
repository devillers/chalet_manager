// app/sites/_components/HeroSection.tsx
import Image from "next/image";
import { MapPin, Users, BedDouble, Bath, Ruler } from "lucide-react";
import type { Villa } from "./villa-types";
import { normalizeGallery, nonEmptyString } from "./villa-helpers";

interface HeroSectionProps {
  villa: Villa;
}

export function HeroSection({ villa }: HeroSectionProps) {
  const heroImageUrl =
    typeof (villa as any).heroImageUrl === "string" ? (villa as any).heroImageUrl.trim() : "";
  const heroImageAlt =
    typeof (villa as any).heroImageAlt === "string" ? (villa as any).heroImageAlt.trim() : "";

  const gallery = normalizeGallery((villa as any).gallery, villa.name || "Photo");
  const galleryFallback = gallery[0]?.url ?? "";

  const src = heroImageUrl || galleryFallback;
  const alt = heroImageAlt || gallery[0]?.alt || villa.name || "Photo de la villa";

  const hasImage = nonEmptyString(src);
  const hasSurface = typeof (villa as any).surface === "number" && (villa as any).surface > 0;

  const region = typeof (villa as any).region === "string" ? (villa as any).region : "";
  const country = typeof (villa as any).country === "string" ? (villa as any).country : "";

  return (
    <section className="relative">
      <div className="relative min-h-[360px] w-full overflow-hidden bg-white lg:min-h-[520px]">
        {hasImage ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority
            unoptimized
            className="rounded-md bg-white object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 rounded-md bg-linear-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-4 pb-10 pt-24 lg:pb-20 lg:pt-36">
          <div className="max-w-xl space-y-4 text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/70">
              Chalet de Montagne Haut de Gamme
            </p>

            <h1 className="text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl">
              {villa.name}
            </h1>

            {(region || country) ? (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>
                  {[region, country].filter(Boolean).join(" · ")}
                </span>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]">
              {typeof (villa as any).maxGuests === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  <span>{(villa as any).maxGuests} voyageurs</span>
                </span>
              ) : null}

              {typeof (villa as any).bedrooms === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <BedDouble className="h-3 w-3" aria-hidden="true" />
                  <span>{(villa as any).bedrooms} chambres</span>
                </span>
              ) : null}

              {typeof (villa as any).bathrooms === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <Bath className="h-3 w-3" aria-hidden="true" />
                  <span>{(villa as any).bathrooms} salles de bain</span>
                </span>
              ) : null}

              {hasSurface ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <Ruler className="h-3 w-3" aria-hidden="true" />
                  <span>~ {(villa as any).surface} m²</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
