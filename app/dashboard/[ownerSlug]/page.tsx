import Link from 'next/link'
import {notFound} from 'next/navigation'
import {client} from '../../../sanity/lib/client'

export const revalidate = 0

type OwnerSite = {
  _id: string
  title: string
  slug: string
  ownerName?: string
  location?: string
  shortDescription?: string
}

async function getOwnerSite(ownerSlug: string): Promise<OwnerSite | null> {
  const query = `
    *[_type == "ownerSite" && slug.current == $slug][0]{
      _id,
      title,
      "slug": slug.current,
      ownerName,
      location,
      shortDescription
    }
  `
  // ⚠️ bien passer { slug: ownerSlug }
  return client.fetch<OwnerSite | null>(query, {slug: ownerSlug})
}

export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ownerSlug: string}>
}) {
  const {ownerSlug} = await params
  const site = await getOwnerSite(ownerSlug)

  if (!site) {
    notFound()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col gap-4 rounded-3xl bg-slate-950 px-5 py-5 text-slate-100">
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-slate-400">
            Compte propriétaire
          </p>
          <h1 className="mt-1 text-sm font-semibold">
            {site.ownerName || 'Propriétaire'}
          </h1>
        </div>

        <nav className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-slate-200">Mon chalet</span>
          <Link
            href={`/sites/${site.slug}`}
            className="text-slate-300 hover:text-white"
          >
            Voir la landing publique →
          </Link>
          <Link href="/studio" className="text-amber-300 hover:text-amber-200">
            Ouvrir le Studio Sanity →
          </Link>
        </nav>
      </aside>

      {/* Contenu */}
      <section className="rounded-3xl bg-white px-6 py-6 shadow-xl shadow-slate-900/10">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Contenu de la landing
        </h2>
        <p className="mt-1 text-xs text-slate-600">
           nterface de préfiguration du dashboard propriétaire. Les champs sont
          pour l’instant en lecture seule ; tu pourras les connecter à des
          mutations Sanity ou laisser la gestion dans le Studio.
        </p>

        <div className="mt-5 flex max-w-lg flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[0.7rem] font-medium text-slate-700">
              Titre du chalet
            </label>
            <input
              type="text"
              defaultValue={site.title}
              readOnly
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none ring-0"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[0.7rem] font-medium text-slate-700">
              Localisation
            </label>
            <input
              type="text"
              defaultValue={site.location}
              readOnly
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none ring-0"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[0.7rem] font-medium text-slate-700">
              Description courte
            </label>
            <textarea
              defaultValue={site.shortDescription}
              readOnly
              rows={5}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none ring-0"
            />
          </div>

          <button
            type="button"
            className="mt-2 inline-flex w-fit cursor-not-allowed items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-[0.7rem] font-semibold text-white opacity-50"
          >
            Sauvegarder (à connecter à Sanity)
          </button>
        </div>
      </section>
    </div>
  )
}
