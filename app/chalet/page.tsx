// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { client } from "../../sanity/lib/client";

export const revalidate = 60;

type VillaCard = {
  _id: string;
  name: string;
  slug: string;
  region: string;
  country: string;
  ownerName?: string;
  shortDescription?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
};

async function getVillas(): Promise<VillaCard[]> {
  const query = `
    *[_type == "villa" && defined(slug.current)] | order(name asc) {
      _id,
      name,
      region,
      country,
      "slug": slug.current,
      "ownerName": ownerSite->ownerName,
      shortDescription,

      "heroImageUrl": coalesce(heroImage.asset->url, gallery[0].asset->url),
      "heroImageAlt": coalesce(heroImage.alt, gallery[0].alt, name)
    }
  `;
  return client.fetch<VillaCard[]>(query);
}

export default async function HomePage() {
  const villas = await getVillas();

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Portail des sites propriétaires
        </h1>
        <p className="max-w-xl text-sm text-slate-600">
          Chaque propriétaire dispose d’une landing page dédiée pour présenter sa villa.
          Cette page rassemble toutes les fiches actives.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {villas.map((villa) => (
          <article
            key={villa._id}
            className="flex min-h-80 flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="relative h-44 w-full">
              {villa.heroImageUrl ? (
                <Image
                  src={villa.heroImageUrl}
                  alt={villa.heroImageAlt || villa.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
              ) : (
                <div className="h-full w-full bg-linear-to-br from-slate-900 via-slate-700 to-slate-500" />
              )}
            </div>

            <div className="flex flex-1 flex-col px-4 pb-3 pt-3">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {villa.name}
                </h2>
                <span className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">
                  {villa.region} · {villa.country}
                </span>
              </div>

              {villa.ownerName ? (
                <p className="mb-1 text-[0.7rem] text-slate-500">
                  Propriétaire&nbsp;: {villa.ownerName}
                </p>
              ) : null}

              {villa.shortDescription ? (
                <p className="line-clamp-4 text-xs text-slate-600">
                  {villa.shortDescription}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <Link
                href={`/sites/${villa.slug}`}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
              >
                Ouvrir la landing
              </Link>

              <Link
                href={`/dashboard/${villa.slug}`}
                className="text-[0.7rem] font-medium text-slate-500 hover:text-slate-900"
              >
                Accéder au dashboard →
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
