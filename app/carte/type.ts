// app/carte/type.ts
export type VillaMapPoint = {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  region?: string;
  country?: string;
  lat: number;
  lng: number;
};
