import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { client } from "@/sanity/lib/client";

type OwnerDashboard = {
  title?: string;
  ownerName?: string;
  ownerEmail?: string;
  location?: string;
  villas?: Array<{
    slug: string;
    name: string;
    region?: string;
    country?: string;
  }>;
};

const OWNER_DASHBOARD_QUERY = `
*[_type=="ownerSite" && slug.current==$slug && ownerPortalKey==$key][0]{
  title,
  ownerName,
  ownerEmail,
  location,
  "villas": *[_type=="villa" && ownerSite._ref==^._id]{
    "slug": slug.current,
    name,
    region,
    country
  } | order(name asc)
}
`;

function first(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

async function getOwnerDashboard(slug: string, key: string) {
  const privateClient = client.withConfig({ useCdn: false });
  return privateClient.fetch<OwnerDashboard | null>(OWNER_DASHBOARD_QUERY, { slug, key });
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OwnerPage({ params, searchParams }: PageProps) {
  noStore();

  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const key = first(sp?.key);

  if (!key || typeof key !== "string") notFound();

  const data = await getOwnerDashboard(slug, key);
  if (!data) notFound();

  const villas = data.villas ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Espace propriétaire</h1>
        <p className="mt-2 text-sm text-slate-600">
          {data.ownerName ? `Bonjour ${data.ownerName}` : "Bonjour"}{data.ownerEmail ? ` • ${data.ownerEmail}` : ""}
        </p>

        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Vos logements</h2>

          {villas.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm text-slate-600">Aucun logement associé.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {villas.map((v) => {
                const location = [v.region, v.country].filter(Boolean).join(", ");
                return (
                  <div key={v.slug} className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
                    <p className="mt-1 text-lg font-semibold">{v.name}</p>
                    {location ? <p className="mt-1 text-sm text-slate-600">{location}</p> : null}

                    <div className="mt-4">
                      <a
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        href={`/sites/${v.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir la page publique
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
