"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, type FormEvent } from "react";
import { lireMeta, mettreEnFile } from "@/lib/terrain/base-locale";
import { evaluerCheckin, lirePosition, type ResultatCheckin } from "@/lib/terrain/geo";
import { compresserPhoto } from "@/lib/terrain/image";
import { Camera, Check, MapPin } from "lucide-react";
import { Compteur, EnTeteVue } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3";

/** Titre numéroté d'une étape de la visite. */
function Etape({ n, titre, facultatif }: { n: number; titre: string; facultatif?: boolean }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-bold">
      <span className="flex size-7 items-center justify-center rounded-full bg-papel-700 text-sm text-white">{n}</span>
      {titre}
      {facultatif && <span className="text-sm font-normal text-gray-500">(facultatif)</span>}
    </h2>
  );
}

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
  const [stock, setStock] = useState("");

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
    const stockSaisi = stock.replace(/\s/g, "");
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
        stockPapelColis: stockSaisi ? Number(stockSaisi) : null, rupture, notes: String(fd.get("notes") ?? ""), enAttente: true,
      });
      await base.pva.update(pvaId, {
        derniereVisite: checkin.at,
        derniereRupture: rupture,
        ...(pva.latitude === null && checkin.resultat.statut === "nouveau_pva" ? { latitude: checkin.latitude, longitude: checkin.longitude } : {}),
      });
      await mettreEnFile(base, "visite", {
        id: visiteId, pva_id: pvaId, checkin_at: checkin.at, latitude: checkin.latitude, longitude: checkin.longitude, precision_m: checkin.precisionM,
        stock_papel_colis: stockSaisi ? Number(stockSaisi) : null, rupture, notes: String(fd.get("notes") ?? ""), prix,
        concurrence: concurrence.filter((c) => c.marqueId).map((c) => ({ marque_id: c.marqueId, produit: c.produit, prix_gnf: c.prix.replace(/\s/g, "") || null })),
      });
      if (photo) await base.photos.add({ id: crypto.randomUUID(), pvaId, visiteId, blob: photo, creeLe: new Date().toISOString(), envoyee: false });
    });
    if (enLigne) void lancerSynchronisation();
    aller(`pva/${pvaId}?visite=ok`);
  };

  const r = checkin?.resultat;
  const valide = r?.statut === "dans_zone" || r?.statut === "nouveau_pva";
  return (
    <div className="flex flex-col gap-3 pb-28">
      <EnTeteVue titre={`Visite : ${pva.nom}`} sousTitre={pva.repere || undefined} retour={`pva/${pvaId}`} />
      {!checkin ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-papel-100 text-papel-700">
            <MapPin size={40} />
          </span>
          <p className="text-gray-800">Le check-in enregistre l&apos;heure et votre position pour confirmer que vous êtes bien sur place.</p>
          <button type="button" onClick={() => void faireCheckin()} className="min-h-16 w-full rounded-2xl bg-papel-700 text-lg font-bold text-white active:scale-[0.99]">
            Je suis sur place : check-in
          </button>
          {message && <p role="status" className="text-amber-900">{message}</p>}
        </section>
      ) : (
        <form onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-3">
          <div role="status" className={`flex items-start gap-2 rounded-2xl border p-3 ${valide ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
            {valide && <Check size={20} className="mt-0.5 shrink-0" />}
            <span>
              {r?.statut === "dans_zone" && `✓ Check-in validé : vous êtes à ${Math.round(r.distanceM)} m du point de vente.`}
              {r?.statut === "nouveau_pva" && "✓ Check-in enregistré : cette position devient celle du point de vente."}
              {r?.statut === "hors_zone" && `⚠ Vous êtes à ${Math.round(r.distanceM)} m du point de vente : la visite sera signalée « hors zone ».`}
              {r?.statut === "imprecis" && `⚠ GPS imprécis (${r.precisionM} m) : la visite sera signalée. Réessayez à découvert si possible.`}
            </span>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-3">
            <Etape n={1} titre="Le stock Papel en boutique" />
            <fieldset className="mb-3">
              <legend className="mb-1 font-medium">Rupture ?</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRupture(false)} aria-pressed={!rupture} className={`min-h-12 rounded-xl border-2 font-bold ${!rupture ? "border-green-700 bg-green-700 text-white" : "border-gray-300 bg-white"}`}>
                  Non
                </button>
                <button type="button" onClick={() => { setRupture(true); setStock("0"); }} aria-pressed={rupture} className={`min-h-12 rounded-xl border-2 font-bold ${rupture ? "border-red-700 bg-red-700 text-white" : "border-gray-300 bg-white"}`}>
                  Oui
                </button>
              </div>
            </fieldset>
            <Compteur id="stock" name="stock" libelle="Stock Papel constaté (colis)" valeur={stock} onChange={setStock} />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-3">
            <Etape n={2} titre="Prix en boutique (GNF / paquet)" facultatif />
            <div className="grid grid-cols-2 gap-2">
              {donnees.produits.map((p) => (
                <div key={p.id}>
                  <label htmlFor={`prix_${p.id}`} className="text-sm font-medium">{p.libelle}</label>
                  <input id={`prix_${p.id}`} name={`prix_${p.id}`} inputMode="numeric" placeholder="Ex. 5000" className={champ} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-3">
            <Etape n={3} titre="Concurrence présente" facultatif />
            {concurrence.map((c, i) => (
              <div key={i} className="mb-2 grid grid-cols-2 gap-2">
                <select aria-label="Marque" value={c.marqueId} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, marqueId: e.target.value } : x)))} className={`${champ} col-span-2`}>
                  <option value="">Marque</option>
                  {donnees.marques.map((m) => (
                    <option key={m.id} value={m.id}>{m.libelle}</option>
                  ))}
                </select>
                <input aria-label="Produit" placeholder="Produit" value={c.produit} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, produit: e.target.value } : x)))} className={champ} />
                <input aria-label="Prix" placeholder="Prix GNF" inputMode="numeric" value={c.prix} onChange={(e) => setConcurrence((l) => l.map((x, j) => (j === i ? { ...x, prix: e.target.value } : x)))} className={champ} />
              </div>
            ))}
            <button type="button" onClick={() => setConcurrence((l) => [...l, { marqueId: "", produit: "", prix: "" }])} className="min-h-11 w-full rounded-xl border border-dashed border-gray-400 font-semibold text-papel-800">
              + Ajouter une marque concurrente
            </button>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-3">
            <Etape n={4} titre="Photo et remarques" facultatif />
            <label className={`mb-2 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 font-bold ${photo ? "border-green-600 bg-green-50 text-green-800" : "border-papel-300 bg-white text-papel-800"}`}>
              {photo ? <Check size={20} /> : <Camera size={22} />}
              {photo ? "Photo prête ✓" : "Prendre une photo du rayon"}
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
            <label htmlFor="notes" className="mb-1 block font-medium">Notes</label>
            <textarea id="notes" name="notes" rows={2} className={`${champ} py-2`} placeholder="Commande souhaitée, remarques du client…" />
          </section>

          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[999] mx-auto max-w-xl px-3">
            <button type="submit" disabled={enCours} className="min-h-14 w-full rounded-2xl bg-papel-700 text-lg font-bold text-white shadow-lg disabled:bg-papel-300">
              Terminer la visite
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
