// app/sites/[slug]/page.tsx
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { DescriptionSection } from "../_components/DescriptionSection";

import { HeroSection } from "@/app/sites/_components/HeroSection";
import { QuickInfoSection } from "@/app/sites/_components/QuickInfoSection";
import { GalleryPreview } from "@/app/sites/_components/GalleryPreview";
import { InfoBlocksSection } from "@/app/sites/_components/InfoBlocksSection";
import { EquipmentsSection } from "@/app/sites/_components/EquipmentsSection";
import { SurroundingsSection } from "@/app/sites/_components/SurroundingsSection";
import { TestimonialsSection } from "@/app/sites/_components/TestimonialsSection";
import { ContactSection } from "@/app/sites/_components/ContactSection";
import { ConditionsSection } from "@/app/sites/_components/ConditionsSection";
import { SimilarVillasSection } from "@/app/sites/_components/SimilarVillasSection";
import { BookingSidebar } from "@/app/sites/_components/BookingSidebar";

import { getBlockedRangesFromIcal } from "../lib/getBlockedRangesFromIcal";
import type { Villa } from "@/app/sites/_components/villa-types";
import type { BlockedRange } from "../lib/getBlockedRangesFromIcal";

export const revalidate = 60;

const VILLA_DOC_TYPE = "villa" as const;

async function getVillaBySlug(slug: string): Promise<Villa | null> {
  const privateClient = client.withConfig({ useCdn: false });
  const query = `
	    *[_type == $docType && slug.current == $slug][0]{
	      "slug": slug.current,
	      name,
      region,
      country,

      // iCal
      availabilityIcalUrl,
      "manualBlockedPeriods": coalesce(manualBlockedPeriods[]{ from, to, comment }, []),

	      // prix (si tes champs existent dans Sanity)
	      priceMin,
	      priceMax,
	      "pricingCalendars": coalesce(pricingCalendars[]{
	        year,
	        defaultNightlyPrice,
	        "overrides": coalesce(overrides[]{ from, to, nightlyPrice, label }, [])
	      }, []),

      // adresse
      street,
      postalCode,
      city,

      maxGuests,
      bedrooms,
      bathrooms,
      surface,
      shortDescription,
      longDescription,

      "heroImage": heroImage.asset->url,
      "heroImageAlt": coalesce(heroImage.alt, name),

      "quickHighlights": coalesce(quickHighlights, []),
      "keyAmenities": coalesce(keyAmenities, []),
      "allAmenitiesCount": coalesce(allAmenitiesCount, count(coalesce(keyAmenities, []))),

      "gallery": coalesce(gallery[].asset->url, []),
      "galleryAlt": coalesce(gallery[].alt, []),

      location{ lat, lng },

      "goodToKnow": coalesce(goodToKnow, []),
      conciergeTitle,
      conciergeSubtitle,
      "conciergePoints": coalesce(conciergePoints, []),
      "extraInfo": coalesce(extraInfo, []),
      surroundingsIntro,
      environmentType,

      "distances": coalesce(distances[]{ label, by, duration }, []),

      "testimonials": coalesce(testimonials[]{ name, date, text, rating }, []),

      "similarVillas": coalesce(similarVillas[]{
        "key": _key,
        "slug": relatedVilla->slug.current,
        "id": relatedVilla->_id,
        "name": relatedVilla->name,
        "location": relatedVilla->region + ", " + relatedVilla->country,
        "image": relatedVilla->heroImage.asset->url,
        "capacityLabel":
          string(relatedVilla->maxGuests) + " voyageurs – " +
          string(relatedVilla->bedrooms) + " chambres",
        extraPersonsBadge,
        periodSuggestion
      }, [])
	    }
	  `;

  return privateClient.fetch<Villa | null>(
    query,
    { docType: VILLA_DOC_TYPE, slug },
    { next: { revalidate, tags: [`villa:${slug}`] } },
  );
}

export async function generateStaticParams() {
  const slugs = await client.fetch<{ slug: string }[]>(
    `*[_type == $docType && defined(slug.current)]{ "slug": slug.current }`,
    { docType: VILLA_DOC_TYPE },
    { next: { revalidate } },
  );
  return slugs.map((s) => ({ slug: s.slug }));
}

export default async function VillaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const villa = await getVillaBySlug(slug);
  if (!villa) notFound();

  const blockedRanges = villa.availabilityIcalUrl
    ? await getBlockedRangesFromIcal(villa.availabilityIcalUrl)
    : [];
  const manualBlockedRanges: BlockedRange[] = Array.isArray(villa.manualBlockedPeriods)
    ? villa.manualBlockedPeriods
        .map((p) => {
          const from = typeof p?.from === "string" ? p.from : "";
          const to = typeof p?.to === "string" ? p.to : "";
          if (!from || !to) return null;
          return { from, to };
        })
        .filter((x): x is BlockedRange => Boolean(x))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="pt-20 lg:pt-24">
        <HeroSection villa={villa} />

        <section className="mx-auto max-w-6xl px-4 py-10 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
            <div className="space-y-10 lg:space-y-12">
              <QuickInfoSection villa={villa} />
              <GalleryPreview villa={villa} />
              <InfoBlocksSection villa={villa} />
              <DescriptionSection villa={villa} />
              <EquipmentsSection villa={villa} />
              <SurroundingsSection villa={villa} />
              <TestimonialsSection villa={villa} />
              <ContactSection villa={villa} />
              <ConditionsSection />
              <SimilarVillasSection villa={villa} />
            </div>

            <BookingSidebar villa={villa} blockedRangesIcal={blockedRanges} blockedRangesManual={manualBlockedRanges} />
          </div>
        </section>
      </main>
    </div>
  );
}
