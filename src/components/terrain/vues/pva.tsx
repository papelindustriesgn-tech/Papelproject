"use client";

import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { distanceMetres, lirePosition, type PointGps } from "@/lib/terrain/geo";
import { EnTeteVue, dateHeure } from "../communs";
import { useTerrain } from "../contexte";

const Carte = dynamic(() => import("@/components/carte/carte").then((m) => m.Carte), { ssr: false, loading: () => <p>Chargement de la carte…</p> });

/** Liste de mes PVA : recherche, tri « autour de moi », carte. */
export function VueListePva() {
  const { base, aller } = useTerrain();
  const [recherche, setRecherche] = useState("");
  const [position, setPosition] = useState<PointGps | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [afficherCarte, setAfficherCarte] = useState(false);
  const pva = useLiveQuery(() => base.pva.orderBy("nom").toArray(), [base]);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtres = (pva ?? []).filter((p) => !q || p.nom.toLowerCase().includes(q) || p.repere.toLowerCase().includes(q) || p.telephone.includes(q));
    const avecDistance = filtres.map((p) => ({ ...p, distance: position && p.latitude !== null && p.longitude !== null ? distanceMetres(position, { latitude: p.latitude, longitude: p.longitude! }) : null }));
    return position ? avecDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) : avecDistance;
  }, [pva, recherche, position]);

  const autourDeMoi = async () => {
    setMessage("Recherche de votre position…");
    try {
      setPosition(await lirePosition());
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Position indisponible.");
    }
  };

  return (
    <div>
      <EnTeteVue
        titre="Mes points de vente"
        action={
          <button type="button" onClick={() => aller("pva-nouveau")} className="min-h-11 rounded-lg bg-papel-700 px-3 font-semibold text-white">
            + PVA
          </button>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Rechercher</span>
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, repère, téléphone" className="min-h-11 w-full rounded-lg border border-gray-300 px-3" />
        </label>
        <button type="button" onClick={() => void autourDeMoi()} className="min-h-11 rounded-lg border border-papel-300 bg-white px-3 font-semibold text-papel-800">
          Autour de moi
        </button>
        <button type="button" onClick={() => setAfficherCarte((v) => !v)} className="min-h-11 rounded-lg border border-papel-300 bg-white px-3 font-semibold text-papel-800">
          {afficherCarte ? "Liste" : "Carte"}
        </button>
      </div>
      {message && <p className="mb-2 text-amber-900" role="status">{message}</p>}
      {afficherCarte && (
        <div className="mb-3">
          <Carte
            hauteur={320}
            onSelection={(id) => aller(`pva/${id}`)}
            points={liste
              .filter((p) => p.latitude !== null && p.longitude !== null)
              .map((p) => ({ id: p.id, latitude: p.latitude!, longitude: p.longitude!, libelle: p.nom, detail: p.repere, couleur: p.derniereRupture ? "#e34948" : "#2a78d6" }))}
          />
          <p className="mt-1 text-sm text-gray-600">Bleu : PVA approvisionné · Rouge : rupture à la dernière visite. La carte nécessite le réseau.</p>
        </div>
      )}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {liste.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => aller(`pva/${p.id}`)} className="flex min-h-14 w-full items-center gap-2 px-3 py-2 text-left">
              <span className="flex-1">
                <span className="block font-semibold">
                  {p.nom} {p.enAttente && <span className="text-sm font-normal text-amber-800">(à envoyer)</span>}
                </span>
                <span className="text-sm text-gray-600">
                  {p.repere}
                  {p.derniereVisite ? ` · vu le ${dateHeure(p.derniereVisite)}` : " · jamais visité"}
                </span>
              </span>
              {p.derniereRupture && <span className="rounded-full bg-red-100 px-2 text-sm font-semibold text-red-800">Rupture</span>}
              {p.distance !== null && <span className="text-sm font-semibold text-papel-800">{p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1).replace(".", ",")} km`}</span>}
            </button>
          </li>
        ))}
      </ul>
      {pva && !pva.length && <p className="mt-3 text-gray-700">Aucun point de vente : créez le premier avec « + PVA ».</p>}
    </div>
  );
}
