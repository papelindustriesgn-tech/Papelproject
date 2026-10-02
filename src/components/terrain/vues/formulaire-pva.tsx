"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, type FormEvent } from "react";
import { mettreEnFile } from "@/lib/terrain/base-locale";
import { lirePosition } from "@/lib/terrain/geo";
import { compresserPhoto } from "@/lib/terrain/image";
import { EnTeteVue } from "../communs";
import { useTerrain } from "../contexte";

const champ = "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3";

/** Création ou modification d'un PVA, entièrement hors ligne. */
export function VueFormulairePva({ id }: { id?: string }) {
  const { base, aller, enLigne, lancerSynchronisation } = useTerrain();
  const donnees = useLiveQuery(async () => ({
    pva: id ? await base.pva.get(id) : undefined,
    types: await base.typesClients.toArray(),
    quartiers: (await base.quartiers.toArray()).sort((a, b) => a.libelle.localeCompare(b.libelle)),
  }), [base, id]);
  const [position, setPosition] = useState<{ latitude: number; longitude: number; precisionM: number } | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState(false);

  if (!donnees) return <p>Chargement…</p>;
  const pva = donnees.pva;

  const capturerPosition = async () => {
    setMessage("Recherche de la position GPS…");
    try {
      const p = await lirePosition();
      setPosition(p);
      setMessage(`Position enregistrée (précision ${p.precisionM} m).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Position indisponible.");
    }
  };

  const enregistrer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (n: string) => String(fd.get(n) ?? "").trim();
    const err: Record<string, string> = {};
    if (!v("nom")) err.nom = "Le nom est obligatoire.";
    if (!v("type_client_id")) err.type_client_id = "Choisissez le type de point de vente.";
    const potentiel = v("potentiel") ? Number(v("potentiel").replace(/\s/g, "")) : null;
    if (potentiel !== null && (!Number.isInteger(potentiel) || potentiel < 0)) err.potentiel = "Nombre de colis par mois (entier).";
    setErreurs(err);
    if (Object.keys(err).length) return;

    setEnCours(true);
    const pvaId = pva?.id ?? crypto.randomUUID();
    const donneesPva = {
      id: pvaId, nom: v("nom"), type_client_id: v("type_client_id"), responsable: v("responsable"), telephone: v("telephone"),
      quartier_id: v("quartier_id") || null, repere: v("repere"), potentiel_colis_mois: potentiel, notes: v("notes"),
      latitude: position?.latitude ?? pva?.latitude ?? null, longitude: position?.longitude ?? pva?.longitude ?? null, precision_m: position?.precisionM ?? null,
    };
    await base.transaction("rw", [base.pva, base.operations, base.photos], async () => {
      await base.pva.put({
        id: pvaId, nom: donneesPva.nom, typeClientId: donneesPva.type_client_id, responsable: donneesPva.responsable, telephone: donneesPva.telephone,
        quartierId: donneesPva.quartier_id, repere: donneesPva.repere, latitude: donneesPva.latitude, longitude: donneesPva.longitude, precisionM: donneesPva.precision_m,
        potentielColisMois: potentiel, clientId: pva?.clientId ?? null, notes: donneesPva.notes, derniereVisite: pva?.derniereVisite ?? null, derniereRupture: pva?.derniereRupture ?? null, enAttente: true,
      });
      await mettreEnFile(base, "pva", donneesPva);
      if (photo) await base.photos.add({ id: crypto.randomUUID(), pvaId, visiteId: null, blob: photo, creeLe: new Date().toISOString(), envoyee: false });
    });
    if (enLigne) void lancerSynchronisation();
    aller(`pva/${pvaId}`);
  };

  const choisirPhoto = async (fichier: File | undefined) => {
    if (!fichier) return;
    setMessage("Compression de la photo…");
    try {
      const b = await compresserPhoto(fichier);
      setPhoto(b);
      setMessage(`Photo prête (${Math.round(b.size / 1024)} Ko).`);
    } catch {
      setMessage("Photo illisible : réessayez.");
    }
  };

  const libelle = "mb-1 block font-medium text-gray-800";
  return (
    <form onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-3" noValidate>
      <EnTeteVue titre={pva ? "Modifier le PVA" : "Nouveau point de vente"} retour={pva ? `pva/${pva.id}` : "pva"} />
      <div>
        <label htmlFor="nom" className={libelle}>Nom du point de vente *</label>
        <input id="nom" name="nom" defaultValue={pva?.nom} className={champ} aria-invalid={erreurs.nom ? true : undefined} />
        {erreurs.nom && <p className="text-sm font-medium text-red-700">{erreurs.nom}</p>}
      </div>
      <div>
        <label htmlFor="type_client_id" className={libelle}>Type *</label>
        <select id="type_client_id" name="type_client_id" defaultValue={pva?.typeClientId ?? ""} className={champ}>
          <option value="">— Choisir —</option>
          {donnees.types.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </select>
        {erreurs.type_client_id && <p className="text-sm font-medium text-red-700">{erreurs.type_client_id}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="responsable" className={libelle}>Responsable</label>
          <input id="responsable" name="responsable" defaultValue={pva?.responsable} className={champ} />
        </div>
        <div>
          <label htmlFor="telephone" className={libelle}>Téléphone</label>
          <input id="telephone" name="telephone" type="tel" defaultValue={pva?.telephone} className={champ} placeholder="+224…" />
        </div>
      </div>
      <div>
        <label htmlFor="quartier_id" className={libelle}>Quartier</label>
        <select id="quartier_id" name="quartier_id" defaultValue={pva?.quartierId ?? ""} className={champ}>
          <option value="">— Non précisé —</option>
          {donnees.quartiers.map((q) => (
            <option key={q.id} value={q.id}>{q.libelle}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="repere" className={libelle}>Repère (pour retrouver la boutique)</label>
        <input id="repere" name="repere" defaultValue={pva?.repere} className={champ} placeholder="Face à la mosquée…" />
      </div>
      <div>
        <label htmlFor="potentiel" className={libelle}>Potentiel estimé (colis par mois)</label>
        <input id="potentiel" name="potentiel" inputMode="numeric" defaultValue={pva?.potentielColisMois ?? ""} className={champ} />
        {erreurs.potentiel && <p className="text-sm font-medium text-red-700">{erreurs.potentiel}</p>}
      </div>
      <div>
        <label htmlFor="notes" className={libelle}>Notes (marques concurrentes présentes, remarques…)</label>
        <textarea id="notes" name="notes" defaultValue={pva?.notes} rows={2} className={`${champ} py-2`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void capturerPosition()} className="min-h-12 flex-1 rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
          {position || pva?.latitude ? "Mettre à jour la position GPS" : "Enregistrer la position GPS"}
        </button>
        <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border border-papel-300 bg-white font-semibold text-papel-800">
          {photo ? "Photo prête ✓" : "Photo de la boutique"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void choisirPhoto(e.target.files?.[0])} />
        </label>
      </div>
      {message && <p role="status" className="text-gray-800">{message}</p>}
      <button type="submit" disabled={enCours} className="min-h-14 rounded-xl bg-papel-700 text-lg font-bold text-white disabled:bg-papel-300">
        Enregistrer
      </button>
    </form>
  );
}
