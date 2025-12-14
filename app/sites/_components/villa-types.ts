// app/sites/_components/villa-types.ts

export type DistanceItem = {
  label: string;
  by: "car" | "walk" | "boat";
  duration: string;
};

export type Testimonial = {
  name: string;
  date: string;
  text: string;
  rating?: number;
};

export type SimilarVilla = {
  id: string;
  slug?: string | null;
  key?: string;
  name: string;
  location: string;
  image: string;
  capacityLabel: string;
  extraPersonsBadge?: string | null;
  periodSuggestion?: string | null;
};

export type Villa = {
  slug: string;

  // geopoint Sanity (peut être vide)
  location?: { lat?: number; lng?: number };

  // adresse
  street?: string;
  postalCode?: string;
  city?: string;

  name: string;
  region: string;
  country: string;

  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  surface: number;

  priceMin?: number;
  priceMax?: number;

  availabilityIcalUrl?: string | null;

  shortDescription: string;
  longDescription: string;

  // IMPORTANT : URL string (projetée via GROQ)
  heroImage: string;
  heroImageAlt: string;

  quickHighlights: string[];
  keyAmenities: string[];
  allAmenitiesCount: number;

  gallery: string[];
  galleryAlt: string[];

  goodToKnow: string[];

  conciergeTitle: string;
  conciergeSubtitle: string;
  conciergePoints: string[];

  extraInfo: string[];

  surroundingsIntro: string;
  environmentType: string;

  distances: DistanceItem[];

  testimonials: Testimonial[];

  // si ton GROQ fait coalesce(..., []), tu peux le rendre non-optionnel
  similarVillas?: SimilarVilla[];
};
