// app/sites/_components/TestimonialsSection.tsx

import type { Villa } from "./villa-types";
import { Star } from "lucide-react";

interface TestimonialsSectionProps {
  villa: Villa;
}

export function TestimonialsSection({ villa }: TestimonialsSectionProps) {
  // On filtre les avis vides ou mal renseignés
  const testimonials =
    villa.testimonials?.filter((t) => t && t.text && t.text.trim().length > 0) ?? [];

  // Si aucun avis → ne rien afficher
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="avis-voyageurs">
      <div className="space-y-4 rounded-3xl bg-white px-4 py-5 shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="avis-voyageurs"
            className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
          >
            L’avis de nos voyageurs
          </h2>
        </div>

        <div className="space-y-4">
          {testimonials.map((testimonial, index) => (
            <figure
              key={`${testimonial.name}-${index}`}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="font-medium text-slate-900">{testimonial.name}</div>
                {typeof testimonial.rating === "number" && testimonial.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3 w-3 fill-amber-500" />
                    <span className="text-xs font-semibold">
                      {testimonial.rating.toFixed(1)} / 5
                    </span>
                  </div>
                )}
              </div>
              {testimonial.date && (
                <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  {testimonial.date}
                </div>
              )}
              <blockquote className="text-[13px] leading-relaxed text-slate-700">
                “{testimonial.text}”
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
