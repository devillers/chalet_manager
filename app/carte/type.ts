// app/carte/type.ts
export type VillaMapPoint = {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  region?: string;
  country?: string;
  intro?: string;
  surface?: number;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  imageUrl?: string;
  imageAlt?: string;
  lat: number;
  lng: number;
};
