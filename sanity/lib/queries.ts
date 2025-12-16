// sanity/lib/queries.ts
import { groq } from "next-sanity";

/**
 * Carte (uniquement les villas avec geopoint)
 */
export const VILLAS_FOR_MAP_QUERY = groq`
  *[
    _type == "villa" && defined(slug.current)
  ] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    city,
    region,
    country,
    street,
    postalCode,
    maxGuests,
    bedrooms,
    bathrooms,
    surface,
    shortDescription,
    keyAmenities,
    quickHighlights,
    "imageUrl": coalesce(heroImage.asset->url, gallery[0].asset->url),
    "imageAlt": coalesce(heroImage.alt, gallery[0].alt, name),
    // geopoint may be missing; we will geocode from address as fallback
    "lat": location.lat,
    "lng": location.lng
  }
`;

/**
 * Page villa (IMPORTANT pour l’image hero)
 * -> heroImage doit être une URL string, pas un objet image.
 */
export const VILLA_BY_SLUG_QUERY = groq`
  *[_type == "villa" && slug.current == $slug][0]{
    "slug": slug.current,

    // Adresse
    street,
    postalCode,
    city,
    region,
    country,

    // Identité
    name,

    // Capacité
    maxGuests,
    bedrooms,
    bathrooms,
    surface,

    // Prix
    priceMin,
    priceMax,

    availabilityIcalUrl,

    // Textes
    shortDescription,
    longDescription,

    // HERO (URL string + alt)
    "heroImage": coalesce(heroImage.asset->url, gallery[0].asset->url),
    "heroImageAlt": coalesce(heroImage.alt, gallery[0].alt, name),

    // Highlights
    quickHighlights,
    keyAmenities,
    allAmenitiesCount,

    // Galerie (urls + alt)
    "gallery": gallery[].asset->url,
    "galleryAlt": gallery[].alt,

    goodToKnow,

    conciergeTitle,
    conciergeSubtitle,
    conciergePoints,

    extraInfo,

    surroundingsIntro,
    environmentType,

    distances[]{
      label,
      by,
      duration
    },

    testimonials[]{
      name,
      date,
      text,
      rating
    },

    // Similar
    "similarVillas": coalesce(similarVillas[]{
      "id": relatedVilla->_id,
      "slug": relatedVilla->slug.current,
      "name": relatedVilla->name,
      "location": coalesce(relatedVilla->city, relatedVilla->region, ""),
      "image": coalesce(relatedVilla->heroImage.asset->url, relatedVilla->gallery[0].asset->url),
      "capacityLabel": select(
        defined(relatedVilla->maxGuests) => (relatedVilla->maxGuests + " pers."),
        true => ""
      ),
      extraPersonsBadge,
      periodSuggestion
    }, [])
  }
`;
