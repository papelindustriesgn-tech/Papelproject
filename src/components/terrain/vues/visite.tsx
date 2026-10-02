"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, type FormEvent } from "react";
import { lireMeta, mettreEnFile } from "@/lib/terrain/base-locale";
import { evaluerCheckin, lirePosition, type ResultatCheckin } from "@/lib/terrain/geo";
import { compresserPhoto } from "@/lib/terrain/image";
import { EnTeteVue } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3";

/** Visite d'un PVA : 1) check-in GPS horodaté, 2) constats (stock, rupture, prix, concurrence, photo). */
export function VueVisite({ pvaId }: { pvaId: string }) {
  const { base, aller, enLigne, lancerSynchronisation } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    pva: await base.pva.get(pvaId),
    produits: (await base.produits.toArray()).sort((a, b) => a.ordre - b.ordre),
    marques: await base.marques.toArray(),
    regles: await lireMeta(base, "regles", { rayonM: 100, precisionMaxM: 50 }),
  }), [base, pvaId]);
  const [checkin, setCheckin] = useState<{ at: string; latitude: number; longitude: number; precisionM: number; resultat: ResultatCheckin } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rupture, setRupture] = useState(false);
  const [concurrence, setConcurrence] = useState<{ marqueId: string; produit: string; prix: string }[]>([]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!donnees) return <p>Chargement…</p>;
  const { pva } = donnees;
  if (!pva) return <EnTeteVue titre="Point de vente introuvable" retour="pva" />;

  const faireCheckin = async () => {
    setMessage("Recherche de votre position GPS…");
    try {
      const p = await lirePosition();
      const resultat = evaluerCheckin(p, pva.latitude !== null && pva.longitude !== null ? { latitude: pva.latitude, longitude: pva.longitude } : null, donnees.regles);
      setCheckin({ at: new Date().toISOString(), ...p, resultat });
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Position indisponible.");
    }
  };

  const enregistrer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkin) return;
    const fd = new FormData(e.currentTarget);
    const stock = String(fd.get("stock") ?? "").trim();
    const prix = donnees.produits
      .map((p) => ({ produit_id: p.id, prix_gnf: Number(String(fd.get(`prix_${p.id}`) ?? "").replace(/\s/g, "")) }))
      .filter((p) => Number.isInteger(p.prix_gnf) && p.prix_gnf > 0);
    const visiteId = crypto.randomUUID();
    setEnCours(true);
    await base.transaction("rw", [base.visites, base.pva, base.operations, base.photos], async () => {
      await base.visites.put({
        id: visiteId, pvaId, checkinAt: checkin.at, latitude: checkin.latitude, longitude: checkin.longitude, precisionM: checkin.precisionM,
        dansZone: checkin.resultat.statut === "dans_zone" || checkin.resultat.statut === "nouveau_pva",
        distanceM: "distanceM" in checkin.resultat ? checkin.resultat.distanceM : null,
        stockPapelColis: stock ? Number(stock) : null, rupture, notes: String(fd.get("notes") ?? ""), enAttente: true,
      });
      await base.pva.update(pvaId, {
        derniereVisite: checkin.at,
        derniereRupture: rupture,
        ...(pva.latitude === null && checkin.resultat.statut === "nouveau_pva" ? { latitude: checkin.latitude, longitude: checkin.longitude } : {}),
      });
      await mettreEnFile(base, "visite", {
        id: visiteId, pva_id: pvaId, checkin_at: checkin.at, latitude: checkin.latitude, longitude: checkin.longitude, precision_m: checkin.precisionM,
        stock_papel_colis: stock ? Number(stock) : null, rupture, notes: String(fd.get("notes") ?? ""), prix,
        concurrence: concurrence.filter((c) => c.marqueId).map((c) => ({ marque_id: c.marqueId, produit: c.produit, prix_gnf: c.prix.replace(/\s/g, "") || null })),
      });
      if (photo) await base.photos.add({ id: crypto.randomUUID(), pvaId, visiteId, blob: photo, creeLe: new Date().toISOString(), envoyee: false });
    });
    if (enLigne) void lancerSynchronisation();
    aller(`pva/${pvaId}`);
  };

  const r = checkin?.resultat;
  return (
    <div className="flex flex-col gap-4">
      <EnTeteVue titre={`Visite : ${pva.nom}`} retour={`pva/${pvaId}`} />
      {!checkin ? (
        <>
          <p className="text-gray-800">Le check-in enregistre l&apos;heure et votre position pour confirmer que vous êtes bien sur place.</p>
          <button type="button" onClick={() => void faireCheckin()} className="min-h-16 rounded-xl bg-papel-700 text-lg font-bold text-white">
            Je suis sur place : check-in
          </button>
          {message && <p role="status" className="text-amber-900">{message}</p>}
        </>
      ) : (
        <form onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-3">
          <div
            role="status"
            className={`rounded-lg border p-3 ${r?.statut === "dans_zone" || r?.statut === "nouveau_pva" ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
          >
            {r?.statut === "dans_zone" && `✓ Check-in validé : vous êtes à ${Math.round(r.distanceM)} m du point de vente.`}
            {r?.statut === "nouveau_pva" && "✓ Check-in enregistré : cette position devient celle du point de vente."}
            {r?.statut === "hors_zone" && `⚠ Vous êtes à ${Math.round(r.distanceM)} m du point de vente : la visite sera signalée « hors zone ».`}
            {r?.statut === "imprecis" && `⚠ GPS imprécis (${r.precisionM} m) : la visite sera signalée. Réessayez à découvert si possible.`}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="stock" className="mb-1 block font-medium">Stock Papel constaté (colis)</label>
              <input id="stock" name="stock" inputMode="numeric" className={champ} />
            </div>
            <fieldset>
              <legend className="mb-1 font-medium">Rupture ?</legend>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRupture(false)} aria-pressed={!rupture} className={`min-h-11 flex-1 rounded-lg border font-semibold ${!rupture ? "border-papel-700 bg-papel-700 text-white" : "border-gray-300 bg-white"}`}>
                  Non
                </button>
                <button type="button" onClick={() => setRupture(true)} aria-pressed={rupture} className={`min-h-11 flex-1 rounded-lg border font-semibold ${rupture ? "border-red-700 bg-red-700 text-white" : "border-gray-300 bg-white"}`}>
                  Oui
                </button>
              </div>
            </fieldset>
          </div>
          <fieldset className="rounded-lg border border-gray-200 p-3">
            <legend className="px-1 font-medium">Prix de vente constaté (GNF / paquet)</legend>
            <div className="grid grid-cols-2 gap-2">
              {donnees.produits.map((p) => (
                <div key={p.id}>
                  <label htmlFor={`prix_${p.id}`} className="text-sm">{p.libelle}</label>
                  <input id={`prix_${p.id}`} name={`prix_${p.id}`} inputMode="numeric" className={champ} />
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="rounded-lg border border-gray-200 p-3">
            <legend className="px-1 font-medium">Concurrence présente</legend>
            {concurrence.map((c, i) => (
              <div key={i} className="mb-2 grid grid-cols-3 gap-2">
                <select aria-label="Marque" value={c.marqueId} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, marqueId: e.target.value } : x)))} className={champ}>
                  <option value="">Marque</option>
                  {donnees.marques.map((m) => (
                    <option key={m.id} value={m.id}>{m.libelle}</option>
                  ))}
                </select>
                <input aria-label="Produit" placeholder="Produit" value={c.produit} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, produit: e.target.value } : x)))} className={champ} />
                <input aria-label="Prix" placeholder="Prix GNF" inputMode="numeric" value={c.prix} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, prix: e.target.value } : x)))} className={champ} />
              </div>
            ))}
            <button type="button" onClick={() => setConcurrence((l) => [...l, { marqueId: "", produit: "", prix: "" }])} className="min-h-11 font-semibold text-papel-700 underline">
              + Ajouter une marque concurrente
            </button>
          </fieldset>
          <div>
            <label htmlFor="notes" className="mb-1 block font-medium">Notes</label>
            <textarea id="notes" name="notes" rows={2} className={`${champ} py-2`} placeholder="Commande souhaitée, remarques du client…" />
          </div>
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
            {photo ? "Photo prête ✓" : "Prendre une photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await compresserPhoto(f).catch(() => null));
              }}
            />
          </label>
          <button type="submit" disabled={enCours} className="min-h-14 rounded-xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
            Terminer la visite
          </button>
        </form>
      )}
    </div>
  );
}
