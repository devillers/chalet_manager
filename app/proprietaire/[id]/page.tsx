import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { client } from "@/sanity/lib/client";
import { SignOutButton } from "@/app/_components/SignOutButton";

export const revalidate = 0;

type OwnerDashboard = {
  ownerName?: string;
  ownerEmail?: string;
  slug?: string;
  villas?: Array<{
    slug: string;
    name: string;
    region?: string;
    country?: string;
  }>;
};

const OWNER_BY_ID_QUERY = `
*[_type=="ownerSite" && _id==$id][0]{
  ownerName,
  ownerEmail,
  "slug": slug.current,
  "villas": *[_type=="villa" && ownerSite._ref==^._id]{
    "slug": slug.current,
    name,
    region,
    country
  } | order(name asc)
}
`;

export default async function ProprietaireDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;

  const session = await auth();
  if (!session) redirect("/login");

  const { role, id: userId } = session.user;
  if (role !== "admin" && role !== "owner") redirect("/redirect");
  if (role === "owner" && userId !== routeId) redirect("/redirect");

  const privateClient = client.withConfig({ useCdn: false });
  const data = await privateClient.fetch<OwnerDashboard | null>(OWNER_BY_ID_QUERY, {
    id: routeId,
  });

  if (!data) {
    // In MVP mode, allow showing a helpful empty state instead of a hard 404.
    notFound();
  }

  const villas = data.villas ?? [];
  const displayName = data.ownerName || "Propriétaire";

  return (
    <div className="min-h-[70vh] rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard propriétaire
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Bonjour {displayName}
          </h1>
          {data.ownerEmail ? (
            <p className="mt-1 text-sm text-slate-600">{data.ownerEmail}</p>
          ) : null}
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Vos villas</h2>

        {villas.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-sm text-slate-600">Aucune villa associée à ce compte.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {villas.map((v) => {
              const location = [v.region, v.country].filter(Boolean).join(", ");
              return (
                <div key={v.slug} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <p className="text-lg font-semibold text-slate-900">{v.name}</p>
                  {location ? <p className="mt-1 text-sm text-slate-600">{location}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-black"
                      href={`/sites/${v.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir la page publique →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Éditer le contenu</h3>
          <p className="mt-1 text-sm text-slate-600">
            La gestion fine du contenu se fait dans le Studio (accès admin).
          </p>
          <div className="mt-4">
            <Link
              href="/studio"
              className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Ouvrir le Studio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
