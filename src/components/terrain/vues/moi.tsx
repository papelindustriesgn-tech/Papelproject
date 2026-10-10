"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientNavigateur } from "@/lib/supabase/navigateur";
import { lireMeta } from "@/lib/terrain/base-locale";
import { aujourdhuiConakry, Chiffre, dateHeure, EnTeteVue, gnfCourt, Progression } from "../communs";
import { useTerrain } from "../contexte";
import type { Objectifs } from "./accueil";

/** Onglet « Moi » : objectifs et résultats du mois, synchronisation, déconnexion. */
export function VueMoi() {
  const { base, enLigne, synchronisation, lancerSynchronisation } = useTerrain();
  const [sortie, setSortie] = useState(false);
  const router = useRouter();
  const mois = aujourdhuiConakry().slice(0, 7);
  const donnees = useLiveQuery(async () => {
    const [visites, pieces, pva, objectifs, profil, derniere] = await Promise.all([
      base.visites.toArray(),
      base.pieces.toArray(),
      base.pva.toArray(),
      lireMeta<Objectifs | null>(base, "objectifs", null),
      lireMeta<{ prenom: string; nom?: string; codeSerie: string | null }>(base, "profil", { prenom: "", codeSerie: null }),
      lireMeta<{ date: string } | null>(base, "derniereSynchro", null),
    ]);
    const vm = visites.filter((v) => v.checkinAt.slice(0, 7) === mois);
    const fm = pieces.filter((p) => p.typePiece === "facture" && p.datePiece.slice(0, 7) === mois && p.etat !== "rejetee");
    return {
      objectifs,
      profil,
      derniere,
      visites: vm.length,
      pvaVisites: new Set(vm.map((v) => v.pvaId)).size,
      nbPva: pva.length,
      ruptures: vm.filter((v) => v.rupture).length,
      horsZone: vm.filter((v) => v.dansZone === false).length,
      factures: fm.length,
      caHt: fm.reduce((s, p) => s + p.totalHtGnf, 0),
      colis: fm.reduce((s, p) => s + p.lignes.reduce((t, l) => t + l.quantiteColis, 0), 0),
    };
  }, [base, mois]);
  if (!donnees) return <p className="p-4">Chargement…</p>;

  const seDeconnecter = async () => {
    setSortie(true);
    await clientNavigateur().auth.signOut();
    router.replace("/connexion");
    router.refresh();
  };
  const nomMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Conakry" }).format(new Date());

  return (
    <div className="flex flex-col gap-3">
      <EnTeteVue retour={null} titre={donnees.profil.prenom ? `${donnees.profil.prenom}${donnees.profil.nom ? ` ${donnees.profil.nom}` : ""}` : "Mon compte"} sousTitre={donnees.profil.codeSerie ? `Série ${donnees.profil.codeSerie}` : undefined} />

      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Mon mois — {nomMois}</h2>
      <div className="grid grid-cols-2 gap-2">
        <Chiffre libelle="Ventes HT" valeur={gnfCourt(donnees.caHt)} />
        <Chiffre libelle="Colis vendus" valeur={donnees.colis} />
        <Chiffre libelle="Factures" valeur={donnees.factures} />
        <Chiffre libelle="Visites" valeur={donnees.visites} />
        <Chiffre libelle="PVA couverts" valeur={`${donnees.pvaVisites} / ${donnees.nbPva}`} />
        <Chiffre libelle="Ruptures vues" valeur={donnees.ruptures} ton={donnees.ruptures > 0 ? "alerte" : "normal"} />
      </div>
      {donnees.horsZone > 0 && <p className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{donnees.horsZone} visite(s) hors zone ce mois : faites le check-in devant la boutique.</p>}

      {donnees.objectifs ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3">
          <h2 className="text-lg font-bold">Mes objectifs</h2>
          <Progression libelle="Visites" realise={donnees.visites} cible={donnees.objectifs.visites} />
          <Progression libelle="Colis facturés" realise={donnees.colis} cible={donnees.objectifs.colis} />
          <Progression libelle="CA HT facturé" realise={donnees.caHt} cible={donnees.objectifs.ca_ht_gnf} format={gnfCourt} />
        </section>
      ) : (
        <p className="rounded-2xl border border-gray-200 bg-white p-3 text-gray-600">Pas d&apos;objectif fixé ce mois-ci.</p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 text-sm text-gray-700">{donnees.derniere ? `Dernière synchronisation : ${dateHeure(donnees.derniere.date)}` : "Jamais synchronisé"}</div>
        <button type="button" onClick={() => void lancerSynchronisation()} disabled={!enLigne || synchronisation.enCours} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-papel-700 font-bold text-white disabled:bg-gray-300">
          <RefreshCw size={18} className={synchronisation.enCours ? "animate-spin" : ""} /> {synchronisation.enCours ? "Synchronisation…" : "Synchroniser maintenant"}
        </button>
      </section>

      <button type="button" onClick={() => void seDeconnecter()} disabled={sortie} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-800">
        <LogOut size={18} /> Se déconnecter
      </button>
      <p className="px-1 text-xs text-gray-500">Vos saisies restent dans le téléphone tant qu&apos;elles ne sont pas envoyées : synchronisez avant de vous déconnecter.</p>
    </div>
  );
}
