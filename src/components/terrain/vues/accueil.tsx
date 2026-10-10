"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FilePlus2, MapPin, Navigation, PlusCircle, Receipt, RefreshCw, Store } from "lucide-react";
import { lireMeta } from "@/lib/terrain/base-locale";
import { aujourdhuiConakry, Chiffre, dateHeure, gnfCourt, Progression, Tuile } from "../communs";
import { useTerrain } from "../contexte";

export interface Objectifs {
  visites: number;
  nouveaux_pva: number;
  ca_ht_gnf: number;
  colis: number;
}

/** « Ma journée » : état de l'envoi, chiffres du jour, prochaine visite, tournée, objectifs. */
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
    const visitesDuJour = visites.filter((v) => v.checkinAt.slice(0, 10) === jour);
    const visitesJour = new Set(visitesDuJour.map((v) => v.pvaId));
    const facturesMois = pieces.filter((p) => p.typePiece === "facture" && p.datePiece.slice(0, 7) === mois && p.etat !== "rejetee");
    const facturesJour = facturesMois.filter((p) => p.datePiece === jour);
    const etapes = tournee.map((id) => pva.find((p) => p.id === id)).filter((p) => p !== undefined).map((p) => ({ ...p!, visite: visitesJour.has(p!.id) }));
    return {
      enAttente: operations.length + photos,
      rejets: operations.filter((o) => o.erreur).length + pieces.filter((p) => p.etat === "rejetee").length,
      etapes,
      prochaine: etapes.find((e) => !e.visite) ?? null,
      objectifs,
      jour: {
        visites: visitesDuJour.length,
        ruptures: visitesDuJour.filter((v) => v.rupture).length,
        caHt: facturesJour.reduce((s, p) => s + p.totalHtGnf, 0),
        colis: facturesJour.reduce((s, p) => s + p.lignes.reduce((t, l) => t + l.quantiteColis, 0), 0),
      },
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

  if (!donnees) return <p className="p-4">Chargement…</p>;
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Conakry" }).format(new Date());
  const faites = donnees.etapes.filter((e) => e.visite).length;

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête d'accueil */}
      <header className="-mx-3 bg-papel-700 px-4 pb-12 pt-5 text-white">
        <p className="text-sm capitalize text-white/80">{date}</p>
        <h1 className="text-2xl font-bold">Bonjour {donnees.profil.prenom || ""} 👋</h1>
      </header>

      {/* État de l'envoi */}
      <section
        className={`-mt-14 rounded-2xl border p-3 shadow-sm ${enLigne ? "border-green-200 bg-white" : "border-amber-300 bg-amber-50"}`}
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={`font-bold ${enLigne ? "text-green-800" : "text-amber-900"}`}>{enLigne ? "● En ligne" : "● Hors ligne — vous pouvez continuer à travailler"}</div>
            <div className="text-sm text-gray-700">
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
          <button
            type="button"
            onClick={() => void lancerSynchronisation()}
            disabled={!enLigne || synchronisation.enCours}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-papel-700 text-white disabled:bg-gray-300"
            aria-label={synchronisation.enCours ? "Synchronisation…" : "Synchroniser"}
          >
            <RefreshCw size={22} className={synchronisation.enCours ? "animate-spin" : ""} />
          </button>
        </div>
      </section>

      {!donnees.profil.codeSerie && donnees.derniere && (
        <p className="rounded-2xl border border-red-300 bg-red-50 p-3 text-red-900">Votre série de numérotation n&apos;est pas définie : vous ne pouvez pas encore faire de factures. Contactez l&apos;administrateur.</p>
      )}

      {/* Chiffres du jour */}
      <section aria-label="Aujourd'hui">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Aujourd&apos;hui</h2>
        <div className="grid grid-cols-2 gap-2">
          <Chiffre libelle="Visites" valeur={donnees.etapes.length ? `${donnees.jour.visites} / ${donnees.etapes.length}` : donnees.jour.visites} />
          <Chiffre libelle="Ventes HT" valeur={gnfCourt(donnees.jour.caHt)} ton={donnees.jour.caHt > 0 ? "bon" : "normal"} />
          <Chiffre libelle="Colis vendus" valeur={donnees.jour.colis} />
          <Chiffre libelle="Ruptures vues" valeur={donnees.jour.ruptures} ton={donnees.jour.ruptures > 0 ? "alerte" : "normal"} />
        </div>
      </section>

      {/* Prochaine visite */}
      {donnees.prochaine && (
        <section className="rounded-2xl border-2 border-papel-300 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-papel-700">Prochaine visite</div>
          <div className="mt-1 text-xl font-bold">{donnees.prochaine.nom}</div>
          {donnees.prochaine.repere && <div className="flex items-center gap-1 text-gray-600"><MapPin size={15} /> {donnees.prochaine.repere}</div>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {donnees.prochaine.latitude !== null ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${donnees.prochaine.latitude},${donnees.prochaine.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-papel-300 font-semibold text-papel-800"
              >
                <Navigation size={18} /> Y aller
              </a>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => aller(`visite/${donnees.prochaine!.id}`)} className="min-h-12 rounded-xl bg-papel-700 font-bold text-white">
              Commencer
            </button>
          </div>
        </section>
      )}

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-2">
        <Tuile libelle="Prospects et clients" detail={`${donnees.nbPva} points de vente`} onClick={() => aller("pva")} icone={<Store size={22} />} />
        <Tuile libelle="Nouveau PVA" detail="Avec position GPS" onClick={() => aller("pva-nouveau")} icone={<PlusCircle size={22} />} />
        <Tuile libelle="Facture / devis" detail="Même sans réseau" onClick={() => aller("document-nouveau")} icone={<FilePlus2 size={22} />} />
        <Tuile libelle="Mes ventes" detail="Devis et factures" onClick={() => aller("documents")} icone={<Receipt size={22} />} />
      </div>

      {/* Tournée */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Tournée du jour</h2>
          {donnees.etapes.length > 0 && <span className="text-sm font-semibold text-papel-700">{faites} / {donnees.etapes.length} faites</span>}
        </div>
        {donnees.etapes.length ? (
          <ol className="divide-y divide-gray-100">
            {donnees.etapes.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => aller(`pva/${p.id}`)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${p.visite ? "bg-green-600 text-white" : "bg-papel-100 text-papel-900"}`}>{p.visite ? "✓" : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${p.visite ? "text-gray-500 line-through" : ""}`}>{p.nom}</span>
                    <span className="block truncate text-sm text-gray-600">{p.repere}</span>
                  </span>
                  {p.derniereRupture && <span className="rounded-full bg-red-100 px-2 text-xs font-semibold text-red-800">Rupture</span>}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-700">Aucune tournée planifiée aujourd&apos;hui. Ouvrez « Points de vente » › « À visiter ».</p>
        )}
      </section>

      {donnees.objectifs && (
        <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3">
          <h2 className="text-lg font-bold text-gray-900">Mes objectifs du mois</h2>
          <Progression libelle="Visites" realise={donnees.realise.visites} cible={donnees.objectifs.visites} />
          <Progression libelle="Colis facturés" realise={donnees.realise.colis} cible={donnees.objectifs.colis} />
          <Progression libelle="CA HT facturé" realise={donnees.realise.caHt} cible={donnees.objectifs.ca_ht_gnf} format={gnfCourt} />
        </section>
      )}
    </div>
  );
}
