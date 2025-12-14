// app/sites/_components/ConditionsSection.tsx

export function ConditionsSection() {
  return (
    <section aria-labelledby="conditions-reservation">
      <div className="space-y-4">
        <h2
          id="conditions-reservation"
          className="text-2xl font-thin uppercase tracking-[0.15em] text-slate-500"
        >
          Conditions de réservation
        </h2>
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <details className="group border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm text-slate-800">
              <span>Acompte & solde</span>
              <span className="text-xs text-slate-500 group-open:text-amber-800">
                Détails
              </span>
            </summary>
            <p className="pb-3 text-xs leading-relaxed text-slate-600">
              Un acompte de 30% est demandé à la confirmation. Le solde est réglé 45
              jours avant l’arrivée. Pour les réservations de dernière minute, le
              montant total est demandé à la confirmation.
            </p>
          </details>

          <details className="group border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm text-slate-800">
              <span>Caution</span>
              <span className="text-xs text-slate-500 group-open:text-amber-800">
                Détails
              </span>
            </summary>
            <p className="pb-3 text-xs leading-relaxed text-slate-600">
              Une empreinte bancaire ou un dépôt de garantie est réalisé avant l’arrivée.
              Il n’est pas débité en l’absence de dommages constatés au départ.
            </p>
          </details>

          <details className="group border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm text-slate-800">
              <span>Politique d’annulation</span>
              <span className="text-xs text-slate-500 group-open:text-amber-800">
                Détails
              </span>
            </summary>
            <p className="pb-3 text-xs leading-relaxed text-slate-600">
              Les conditions d’annulation varient selon la période. Elles sont
              présentées clairement avant toute validation de réservation.
            </p>
          </details>

          <details className="group border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm text-slate-800">
              <span>Arrivée anticipée & départ tardif</span>
              <span className="text-xs text-slate-500 group-open:text-amber-800">
                Détails
              </span>
            </summary>
            <p className="pb-3 text-xs leading-relaxed text-slate-600">
              Selon les disponibilités, nous pouvons organiser une arrivée anticipée ou
              un départ tardif. Ces options sont confirmées quelques jours avant votre
              séjour.
            </p>
          </details>

          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm text-slate-800">
              <span>Assurance annulation</span>
              <span className="text-xs text-slate-500 group-open:text-amber-800">
                Détails
              </span>
            </summary>
            <p className="pb-1 text-xs leading-relaxed text-slate-600">
              Une assurance annulation peut être proposée pour couvrir les aléas de
              votre voyage. Nos conseillers vous orientent vers la solution adaptée.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
