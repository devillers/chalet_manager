// app/sites/_components/villa-helpers.ts
export type GalleryItem = { url: string; alt?: string };

export function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

export function normalizeGallery(
  input: unknown,
  fallbackAlt: string
): GalleryItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      // string[]
      if (typeof item === "string") {
        const url = item.trim();
        return url ? { url, alt: fallbackAlt } : null;
      }

      // { url, alt }[]
      if (item && typeof item === "object") {
        const any = item as any;
        const url = typeof any.url === "string" ? any.url.trim() : "";
        const alt = typeof any.alt === "string" ? any.alt.trim() : "";
        if (!url) return null;
        return { url, alt: alt || fallbackAlt };
      }

      return null;
    })
    .filter(Boolean) as GalleryItem[];
}

export function getSlug(slugLike: unknown): string | undefined {
  if (!slugLike) return undefined;
  if (typeof slugLike === "string") return slugLike;
  if (typeof (slugLike as any)?.current === "string") return (slugLike as any).current;
  return undefined;
}

export function formatFullAddress(parts: Array<unknown>): string {
  return parts
    .filter(nonEmptyString)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
