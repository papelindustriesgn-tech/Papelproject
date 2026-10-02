"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { lireMeta } from "@/lib/terrain/base-locale";
import { aujourdhuiConakry, dateHeure, gnfCourt, Progression, Tuile } from "../communs";
import { useTerrain } from "../contexte";

interface Objectifs {
  visites: number;
  nouveaux_pva: number;
  ca_ht_gnf: number;
  colis: number;
}

export function VueAccueil() {
  const { base, enLigne, synchronisation, lancerSynchronisation, aller } = useTerrain();
  const jour = aujourdhuiConakry();
  const mois = jour.slice(0, 7);

  const donnees = useLiveQuery(async () => {
    const [operations, photos, tournee, pva, visites, pieces, objectifs, derniere, profil] = await Promise.all([
      base.operations.toArray(),
      base.photos.filter((p) => !p.envoyee).count(),
      lireMeta<string[]>(base, "tournee", []),
      base.pva.toArray(),
      base.visites.toArray(),
      base.pieces.toArray(),
      lireMeta<Objectifs | null>(base, "objectifs", null),
      lireMeta<{ date: string } | null>(base, "derniereSynchro", null),
      lireMeta<{ prenom: string; codeSerie: string | null }>(base, "profil", { prenom: "", codeSerie: null }),
    ]);
    const visitesMois = visites.filter((v) => v.checkinAt.slice(0, 7) === mois);
    const visitesJour = new Set(visites.filter((v) => v.checkinAt.slice(0, 10) === jour).map((v) => v.pvaId));
    const facturesMois = pieces.filter((p) => p.typePiece === "facture" && p.datePiece.slice(0, 7) === mois && p.etat !== "rejetee");
    return {
      enAttente: operations.length + photos,
      rejets: operations.filter((o) => o.erreur).length + pieces.filter((p) => p.etat === "rejetee").length,
      etapes: tournee.map((id) => pva.find((p) => p.id === id)).filter((p) => p !== undefined).map((p) => ({ ...p!, visite: visitesJour.has(p!.id) })),
      objectifs,
      realise: {
        visites: visitesMois.length,
        caHt: facturesMois.reduce((s, p) => s + p.totalHtGnf, 0),
        colis: facturesMois.reduce((s, p) => s + p.lignes.reduce((t, l) => t + l.quantiteColis, 0), 0),
      },
      nbPva: pva.length,
      derniere,
      profil,
    };
  }, [base, jour, mois]);

  if (!donnees) return <p>Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <section className={`rounded-xl border p-3 ${enLigne ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`} aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold">{enLigne ? "● En ligne" : "● Hors ligne — vous pouvez continuer à travailler"}</div>
            <div className="text-sm">
              {donnees.enAttente > 0 ? `${donnees.enAttente} saisie(s) en attente d'envoi` : "Tout est envoyé"}
              {donnees.derniere && ` · dernière synchronisation ${dateHeure(donnees.derniere.date)}`}
            </div>
            {synchronisation.erreur && <div className="text-sm font-medium text-amber-900">{synchronisation.erreur}</div>}
            {donnees.rejets > 0 && (
              <button type="button" onClick={() => aller("documents")} className="text-sm font-semibold text-red-700 underline">
                {donnees.rejets} saisie(s) refusée(s) par le serveur : voir le détail
              </button>
            )}
          </div>
          <button type="button" onClick={() => void lancerSynchronisation()} disabled={!enLigne || synchronisation.enCours} className="min-h-11 rounded-lg bg-papel-700 px-4 font-semibold text-white disabled:bg-papel-300">
            {synchronisation.enCours ? "Synchronisation…" : "Synchroniser"}
          </button>
        </div>
      </section>

      {!donnees.profil.codeSerie && donnees.derniere && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">Votre série de numérotation n&apos;est pas définie : vous ne pouvez pas encore faire de factures. Contactez l&apos;administrateur.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tuile libelle="Mes points de vente" detail={`${donnees.nbPva} PVA`} onClick={() => aller("pva")} />
        <Tuile libelle="Nouveau PVA" detail="Avec position GPS" onClick={() => aller("pva-nouveau")} />
        <Tuile libelle="Facture / devis" detail="Même sans réseau" onClick={() => aller("document-nouveau")} />
        <Tuile libelle="Mes documents" detail="Devis et factures" onClick={() => aller("documents")} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-lg font-bold text-papel-900">Tournée du jour</h2>
        {donnees.etapes.length ? (
          <ol className="divide-y divide-gray-100">
            {donnees.etapes.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => aller(`pva/${p.id}`)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
                  <span className={`flex size-8 items-center justify-center rounded-full font-bold ${p.visite ? "bg-green-600 text-white" : "bg-papel-100 text-papel-900"}`}>{p.visite ? "✓" : i + 1}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{p.nom}</span>
                    <span className="text-sm text-gray-600">{p.repere}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-700">Aucune tournée planifiée aujourd&apos;hui.</p>
        )}
      </section>

      {donnees.objectifs && (
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <h2 className="text-lg font-bold text-papel-900">Mes objectifs du mois</h2>
          <Progression libelle="Visites" realise={donnees.realise.visites} cible={donnees.objectifs.visites} />
          <Progression libelle="Colis facturés" realise={donnees.realise.colis} cible={donnees.objectifs.colis} />
          <Progression libelle="CA HT facturé" realise={donnees.realise.caHt} cible={donnees.objectifs.ca_ht_gnf} format={gnfCourt} />
        </section>
      )}
    </div>
  );
}
