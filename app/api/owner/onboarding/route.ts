// app/api/owner/onboarding/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function adminClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error(
      `Env manquantes: NEXT_PUBLIC_SANITY_PROJECT_ID=${!!projectId}, NEXT_PUBLIC_SANITY_DATASET=${!!dataset}, SANITY_API_TOKEN=${!!token}`
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
    token,
  });
}

function slugify(input: string) {
  const s = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return s || "item";
}

function s(fd: FormData, key: string) {
  const v = fd.get(key);
  return v == null ? "" : String(v).trim();
}

function n(fd: FormData, key: string): number | undefined {
  const v = fd.get(key);
  if (v == null) return undefined;
  const str = String(v).trim();
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

function randomOwnerKey() {
  return `owner-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

async function ensureUniqueSlug(
  client: ReturnType<typeof adminClient>,
  type: "ownerSite" | "villa",
  base: string
) {
  const exists = await client.fetch<number>(
    `count(*[_type==$type && slug.current==$slug])`,
    { type, slug: base }
  );
  if (exists === 0) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function uploadImages(
  client: ReturnType<typeof adminClient>,
  files: File[],
  label: string
) {
  const assets: Array<{ _id: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const buf = Buffer.from(await f.arrayBuffer());
    const asset = await client.assets.upload("image", buf, {
      filename: f.name || `${label}-${i + 1}.jpg`,
      contentType: f.type || "image/jpeg",
    });
    assets.push({ _id: asset._id });
  }
  return assets;
}

type SanityRef = { _type: "reference"; _ref: string };
type SanityImage = { _type: "image"; asset: SanityRef; alt?: string };
type SanityGalleryItem = SanityImage & { _key: string };

type VillaPayload = {
  _type: "villa";
  ownerSite: SanityRef;
  name: string;
  slug: { _type: "slug"; current: string };
  region: string;
  country: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  shortDescription: string;
  longDescription: string;
  heroImage?: SanityImage;
  gallery?: SanityGalleryItem[];
};

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/owner/onboarding" });
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const client = adminClient();

    // 11 champs
    const ownerName = s(fd, "ownerName");
    const ownerEmail = s(fd, "ownerEmail");
    const ownerPhone = s(fd, "ownerPhone");

    const villaName = s(fd, "name");
    const region = s(fd, "region");
    const country = s(fd, "country") || "France";

    const maxGuests = n(fd, "maxGuests");
    const bedrooms = n(fd, "bedrooms");
    const bathrooms = n(fd, "bathrooms");

    const shortDescription = s(fd, "shortDescription");
    const longDescription = s(fd, "longDescription");

    const heroIndexRaw = n(fd, "heroIndex");
    const heroIndex =
      typeof heroIndexRaw === "number" && heroIndexRaw >= 0 ? heroIndexRaw : 0;

    // validations
    if (!ownerName)
      return NextResponse.json({ error: "ownerName requis." }, { status: 400 });
    if (!ownerEmail)
      return NextResponse.json({ error: "ownerEmail requis." }, { status: 400 });

    if (!villaName)
      return NextResponse.json({ error: "name requis." }, { status: 400 });
    if (!region)
      return NextResponse.json({ error: "region requis." }, { status: 400 });
    if (!country)
      return NextResponse.json({ error: "country requis." }, { status: 400 });

    if (maxGuests === undefined || maxGuests < 1)
      return NextResponse.json(
        { error: "maxGuests invalide (≥ 1)." },
        { status: 400 }
      );
    if (bedrooms === undefined || bedrooms < 1)
      return NextResponse.json(
        { error: "bedrooms invalide (≥ 1)." },
        { status: 400 }
      );
    if (bathrooms === undefined || bathrooms < 1)
      return NextResponse.json(
        { error: "bathrooms invalide (≥ 1)." },
        { status: 400 }
      );

    if (!shortDescription || shortDescription.length < 10)
      return NextResponse.json(
        { error: "shortDescription trop courte (≥ 10)." },
        { status: 400 }
      );

    if (!longDescription || longDescription.length < 50)
      return NextResponse.json(
        { error: "longDescription trop courte (≥ 50)." },
        { status: 400 }
      );

    // Images (optionnel)
    const imageFiles = fd
      .getAll("images")
      .filter((x): x is File => x instanceof File)
      .slice(0, 20);

    const assets = imageFiles.length
      ? await uploadImages(client, imageFiles, villaName)
      : [];

    const gallery: SanityGalleryItem[] | undefined =
      assets.length > 0
        ? assets.map((a, i) => ({
            _key: randomUUID(),
            _type: "image",
            asset: { _type: "reference", _ref: a._id },
            alt: `${villaName} – photo ${i + 1}`,
          }))
        : undefined;

    const heroAsset = assets[heroIndex] || assets[0];
    const heroImage: SanityImage | undefined =
      heroAsset?._id
        ? {
            _type: "image",
            asset: { _type: "reference", _ref: heroAsset._id },
            alt: `${villaName} – hero`,
          }
        : undefined;

    // 1) upsert ownerSite (par email)
    const ownerSlugBase = slugify(ownerName);

    const existingOwnerSite = await client.fetch<{
      _id: string;
      slug: string;
      ownerPortalKey?: string;
    } | null>(
      `*[_type=="ownerSite" && ownerEmail==$email][0]{ _id, "slug": slug.current, ownerPortalKey }`,
      { email: ownerEmail }
    );

    let ownerSiteId: string;
    let ownerSlug: string;
    let ownerPortalKey: string;

    if (!existingOwnerSite) {
      ownerSlug = await ensureUniqueSlug(client, "ownerSite", ownerSlugBase);
      ownerPortalKey = randomOwnerKey();

      const created = await client.create({
        _type: "ownerSite",
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || undefined,
        slug: { _type: "slug", current: ownerSlug },
        ownerPortalKey,
        ownerPortalUrl: `/owner/${ownerSlug}?key=${encodeURIComponent(
          ownerPortalKey
        )}`,
      });

      ownerSiteId = created._id;
    } else {
      ownerSiteId = existingOwnerSite._id;
      ownerSlug = existingOwnerSite.slug;
      ownerPortalKey = existingOwnerSite.ownerPortalKey || randomOwnerKey();

      await client
        .patch(ownerSiteId)
        .set({
          ownerName,
          ownerEmail,
          ownerPhone: ownerPhone || undefined,
          ownerPortalKey,
          ownerPortalUrl: `/owner/${ownerSlug}?key=${encodeURIComponent(
            ownerPortalKey
          )}`,
        })
        .commit();
    }

    // 2) villa idempotent simple
    const existingVilla = await client.fetch<{ _id: string; slug?: string } | null>(
      `*[_type=="villa" && ownerSite._ref==$ownerId && name==$name][0]{_id, "slug": slug.current}`,
      { ownerId: ownerSiteId, name: villaName }
    );

    // IMPORTANT: si la villa existe, on conserve son slug (évite de casser l’URL)
    const villaSlugBase = slugify(villaName);
    const villaSlug = existingVilla?.slug
      ? existingVilla.slug
      : await ensureUniqueSlug(client, "villa", villaSlugBase);

    const villaPayload: VillaPayload = {
      _type: "villa",
      ownerSite: { _type: "reference", _ref: ownerSiteId },

      name: villaName,
      slug: { _type: "slug", current: villaSlug },

      region,
      country,

      maxGuests,
      bedrooms,
      bathrooms,

      shortDescription,
      longDescription,

      heroImage,
      gallery,
    };

    let villaId: string;

    if (!existingVilla) {
      const createdVilla = await client.create(villaPayload);
      villaId = createdVilla._id;
    } else {
      await client.patch(existingVilla._id).set(villaPayload).commit();
      villaId = existingVilla._id;
    }

    const origin = req.headers.get("origin") || "";
    return NextResponse.json({
      ok: true,
      ownerUrl: `${origin}/owner/${ownerSlug}?key=${encodeURIComponent(
        ownerPortalKey
      )}`,
      publicUrl: `${origin}/sites/${villaSlug}`,
      owner: { id: ownerSiteId, slug: ownerSlug },
      villa: { id: villaId, slug: villaSlug },
    });
  } catch (err: unknown) {
    console.error("[onboarding] ERROR", err);
    return NextResponse.json(
      { error: "Erreur serveur.", detail: errorMessage(err) },
      { status: 500 }
    );
  }
}
