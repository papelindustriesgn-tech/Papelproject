"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Crosshair, List, Map as IconeCarte, Navigation, Phone, Plus, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { lireMeta } from "@/lib/terrain/base-locale";
import { distanceMetres, lirePosition, type PointGps } from "@/lib/terrain/geo";
import { EnTeteVue, joursDepuis, numeroInternational, Vide } from "../communs";
import { ListeClients } from "./clients";
import { useTerrain } from "../contexte";

const Carte = dynamic(() => import("@/components/carte/carte").then((m) => m.Carte), { ssr: false, loading: () => <p>Chargement de la carte…</p> });

type Filtre = "tous" | "a_visiter" | "rupture" | "tournee";
const FILTRES: { code: Filtre; libelle: string }[] = [
  { code: "tous", libelle: "Tous" },
  { code: "a_visiter", libelle: "À visiter" },
  { code: "rupture", libelle: "En rupture" },
  { code: "tournee", libelle: "Tournée du jour" },
];
/** Un point de vente non visité depuis ce nombre de jours est « à visiter ». */
const JOURS_A_VISITER = 7;

/** Prospects et clients : recherche, filtres rapides, « autour de moi », carte, actions en un geste. */
export function VueListePva() {
  const { base, aller, route } = useTerrain();
  const [segment, setSegment] = useState<"tous" | "prospects" | "clients">((route.params.get("vue") as "prospects" | "clients" | null) ?? "tous");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [position, setPosition] = useState<PointGps | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [afficherCarte, setAfficherCarte] = useState(false);
  const donnees = useLiveQuery(async () => ({ pva: await base.pva.orderBy("nom").toArray(), tournee: await lireMeta<string[]>(base, "tournee", []), nbClients: await base.clients.count() }), [base]);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const tournee = new Set(donnees?.tournee ?? []);
    const filtres = (donnees?.pva ?? [])
      .filter((p) => segment !== "prospects" || !p.clientId)
      .filter((p) => !q || p.nom.toLowerCase().includes(q) || p.repere.toLowerCase().includes(q) || p.telephone.includes(q))
      .filter((p) => {
        const jours = joursDepuis(p.derniereVisite);
        if (filtre === "a_visiter") return jours === null || jours >= JOURS_A_VISITER;
        if (filtre === "rupture") return p.derniereRupture === true;
        if (filtre === "tournee") return tournee.has(p.id);
        return true;
      });
    const avecDistance = filtres.map((p) => ({ ...p, distance: position && p.latitude !== null && p.longitude !== null ? distanceMetres(position, { latitude: p.latitude, longitude: p.longitude! }) : null }));
    return position ? avecDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) : avecDistance;
  }, [donnees, recherche, filtre, position, segment]);

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
        titre="Prospects et clients"
        retour={null}
        sousTitre={donnees ? `${donnees.pva.filter((p) => !p.clientId).length} prospects · ${donnees.nbClients} clients` : undefined}
        action={
          <button type="button" onClick={() => aller("pva-nouveau")} className="flex size-11 items-center justify-center rounded-full bg-white/15 active:bg-white/30" aria-label="Nouveau PVA">
            <Plus size={24} />
          </button>
        }
      />
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-2xl bg-gray-200 p-1" role="group" aria-label="Prospects ou clients">
        {(
          [
            ["tous", "Tous"],
            ["prospects", "Prospects"],
            ["clients", "Clients"],
          ] as const
        ).map(([code, libelle]) => (
          <button key={code} type="button" aria-pressed={segment === code} onClick={() => setSegment(code)} className={`min-h-11 rounded-xl font-bold ${segment === code ? "bg-white text-papel-800 shadow" : "text-gray-600"}`}>
            {libelle}
          </button>
        ))}
      </div>
      <div className="mb-2 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={segment === "clients" ? "Nom, code, téléphone" : "Nom, repère, téléphone"} className="min-h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3" />
        </label>
        {segment !== "clients" && (
          <>
        <button type="button" onClick={() => void autourDeMoi()} className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${position ? "border-papel-700 bg-papel-700 text-white" : "border-gray-300 bg-white text-papel-800"}`} aria-label="Autour de moi" title="Autour de moi">
          <Crosshair size={22} />
        </button>
        <button type="button" onClick={() => setAfficherCarte((v) => !v)} className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-papel-800" aria-label={afficherCarte ? "Liste" : "Carte"} title={afficherCarte ? "Liste" : "Carte"}>
          {afficherCarte ? <List size={22} /> : <IconeCarte size={22} />}
        </button>
          </>
        )}
      </div>
      {segment === "clients" ? (
        <ListeClients recherche={recherche} />
      ) : (
        <>
      <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtres">
        {FILTRES.map((f) => (
          <button
            key={f.code}
            type="button"
            onClick={() => setFiltre(f.code)}
            aria-pressed={filtre === f.code}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${filtre === f.code ? "border-papel-700 bg-papel-700 text-white" : "border-gray-300 bg-white text-gray-700"}`}
          >
            {f.libelle}
          </button>
        ))}
      </div>
      {position && <p className="mb-2 text-sm text-papel-800">Classés du plus proche au plus loin.</p>}
      {message && <p className="mb-2 text-amber-900" role="status">{message}</p>}
      {afficherCarte && (
        <div className="mb-3 overflow-hidden rounded-2xl">
          <Carte
            hauteur={340}
            onSelection={(id) => aller(`pva/${id}`)}
            points={liste
              .filter((p) => p.latitude !== null && p.longitude !== null)
              .map((p) => ({ id: p.id, latitude: p.latitude!, longitude: p.longitude!, libelle: p.nom, detail: p.repere, couleur: p.derniereRupture ? "#e34948" : "#2a78d6" }))}
          />
          <p className="mt-1 text-sm text-gray-600">Bleu : approvisionné · Rouge : rupture à la dernière visite. La carte nécessite le réseau.</p>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {liste.map((p) => {
          const jours = joursDepuis(p.derniereVisite);
          const etat = p.derniereRupture ? "rupture" : jours === null || jours >= JOURS_A_VISITER ? "a_visiter" : jours === 0 ? "vu_aujourdhui" : "ok";
          const bord = { rupture: "border-l-red-600", a_visiter: "border-l-amber-500", vu_aujourdhui: "border-l-green-600", ok: "border-l-papel-300" }[etat];
          return (
            <li key={p.id} className={`overflow-hidden rounded-2xl border border-l-4 border-gray-200 bg-white ${bord}`}>
              <button type="button" onClick={() => aller(`pva/${p.id}`)} className="flex w-full items-start gap-2 px-3 pb-2 pt-3 text-left active:bg-gray-50">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {p.nom} {p.enAttente && <span className="text-sm font-normal text-amber-800">(à envoyer)</span>}
                  </span>
                  <span className="block truncate text-sm text-gray-600">{p.repere || "—"}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold">
                    {p.derniereRupture && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Rupture</span>}
                    {etat === "vu_aujourdhui" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Vu aujourd&apos;hui</span>}
                    {jours === null && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Jamais visité</span>}
                    {jours !== null && jours > 0 && <span className={`rounded-full px-2 py-0.5 ${jours >= JOURS_A_VISITER ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700"}`}>Vu il y a {jours} j</span>}
                  </span>
                </span>
                {p.distance !== null && (
                  <span className="shrink-0 text-sm font-bold text-papel-800">{p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1).replace(".", ",")} km`}</span>
                )}
              </button>
              <div className="grid grid-cols-3 border-t border-gray-100 text-sm font-semibold text-papel-800">
                {p.telephone ? (
                  <a href={`tel:${numeroInternational(p.telephone)}`} className="flex min-h-11 items-center justify-center gap-1.5 active:bg-gray-50">
                    <Phone size={16} /> Appeler
                  </a>
                ) : (
                  <span className="flex min-h-11 items-center justify-center gap-1.5 text-gray-300">
                    <Phone size={16} /> Appeler
                  </span>
                )}
                {p.latitude !== null ? (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 border-x border-gray-100 active:bg-gray-50">
                    <Navigation size={16} /> Y aller
                  </a>
                ) : (
                  <span className="flex min-h-11 items-center justify-center gap-1.5 border-x border-gray-100 text-gray-300">
                    <Navigation size={16} /> Y aller
                  </span>
                )}
                <button type="button" onClick={() => aller(`visite/${p.id}`)} className="flex min-h-11 items-center justify-center gap-1.5 bg-papel-50 active:bg-papel-100">
                  Visiter
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {donnees && !donnees.pva.length && <Vide texte="Aucun point de vente : créez le premier avec le bouton +." />}
      {donnees && donnees.pva.length > 0 && !liste.length && <Vide texte="Aucun point de vente ne correspond." />}
        </>
      )}
    </div>
  );
}
