import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/app/_components/SignOutButton";

export const revalidate = 0;

export default async function LocataireDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;

  const session = await auth();
  if (!session) redirect("/login");

  const { role, id: userId } = session.user;
  if (role !== "admin" && role !== "tenant") redirect("/redirect");
  if (role === "tenant" && userId !== routeId) redirect("/redirect");

  return (
    <div className="min-h-[70vh] rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard locataire
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Espace locataire
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            À connecter à tes réservations et documents (contrats, factures, etc.).
          </p>
        </div>

        <SignOutButton />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Réservations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cette zone affichera tes réservations et les détails de séjour.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Aide & contact</h2>
          <p className="mt-1 text-sm text-slate-600">
            Besoin d’aide ? Utilise le formulaire de contact.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Contacter →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
