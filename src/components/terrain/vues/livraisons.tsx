"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PackageCheck } from "lucide-react";
import { useState } from "react";
import { mettreEnFile, type LivraisonLocale } from "@/lib/terrain/base-locale";
import { dateHeure } from "../communs";
import { useTerrain } from "../contexte";

const REMISES: Record<string, string> = { livree: "Livrée", partielle: "Livrée en partie", refusee: "Refusée par le client" };

/**
 * « Livraisons à confirmer » (accueil du commercial) : une fois la livraison remise par la logistique, le commercial
 * confirme que son client a bien reçu, ou signale un problème. Fonctionne hors ligne (envoi à la synchronisation).
 */
export function LivraisonsAConfirmer() {
  const { base, enLigne, lancerSynchronisation } = useTerrain();
  const [tout, setTout] = useState(false);
  const donnees = useLiveQuery(async () => {
    // Remises des 30 derniers jours, les plus récentes d'abord.
    const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return {
      livraisons: (await base.livraisons.toArray()).filter((l) => l.statutRemise !== "a_livrer" && !l.confirmation && (l.remiseLe ?? "") >= depuis).sort((a, b) => (b.remiseLe ?? "").localeCompare(a.remiseLe ?? "")),
      clients: await base.clients.toArray(),
    };
  }, [base]);
  if (!donnees?.livraisons.length) return null;
  const visibles = tout ? donnees.livraisons : donnees.livraisons.slice(0, 3);

  const confirmer = async (l: LivraisonLocale, confirmation: "conforme" | "probleme", note = "") => {
    await base.transaction("rw", [base.livraisons, base.operations], async () => {
      await base.livraisons.update(l.id, { confirmation, enAttente: true });
      await mettreEnFile(base, "confirmation", { id: l.id, livraison_id: l.id, confirmation, note });
    });
    if (enLigne) void lancerSynchronisation();
  };

  return (
    <section aria-label="Livraisons à confirmer" className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-3">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-sky-950">
        <PackageCheck size={22} aria-hidden /> Livraisons à confirmer ({donnees.livraisons.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {visibles.map((l) => (
          <CarteLivraison key={l.id} l={l} client={donnees.clients.find((c) => c.id === l.clientId)?.nom ?? ""} confirmer={confirmer} />
        ))}
      </ul>
      {donnees.livraisons.length > visibles.length && (
        <button type="button" onClick={() => setTout(true)} className="mt-2 min-h-11 w-full rounded-xl bg-white font-semibold text-sky-900">
          Voir les {donnees.livraisons.length - visibles.length} autres
        </button>
      )}
    </section>
  );
}

function CarteLivraison({ l, client, confirmer }: { l: LivraisonLocale; client: string; confirmer: (l: LivraisonLocale, c: "conforme" | "probleme", note?: string) => Promise<void> }) {
  const [probleme, setProbleme] = useState(false);
  const [note, setNote] = useState("");
  return (
    <li className="rounded-xl bg-white p-3">
      <div className="font-bold">{client || "Client"}</div>
      <div className="text-sm text-gray-600">
        {l.numero} · commande {l.commandeNumero}
      </div>
      <div className="mt-1 text-sm">
        <span className="font-semibold">{REMISES[l.statutRemise] ?? l.statutRemise}</span>
        {l.remiseLe ? ` le ${dateHeure(l.remiseLe)}` : ""}
        {l.receptionnaire ? ` · reçu par ${l.receptionnaire}` : ""}
        {l.commentaire ? ` · ${l.commentaire}` : ""}
      </div>
      {probleme ? (
        <div className="mt-2 flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor={`note-${l.id}`}>
            Quel problème le client signale-t-il ?
          </label>
          <textarea id={`note-${l.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-xl border border-gray-300 p-2" placeholder="Ex. 2 colis manquants, carton abîmé…" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setProbleme(false)} className="min-h-12 rounded-xl border border-gray-300 font-semibold">
              Retour
            </button>
            <button type="button" disabled={!note.trim()} onClick={() => void confirmer(l, "probleme", note.trim())} className="min-h-12 rounded-xl bg-red-700 font-bold text-white disabled:bg-red-300">
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void confirmer(l, "conforme")} className="min-h-12 rounded-xl bg-papel-700 font-bold text-white">
            Le client a bien reçu
          </button>
          <button type="button" onClick={() => setProbleme(true)} className="min-h-12 rounded-xl border-2 border-red-300 font-semibold text-red-800">
            Signaler un problème
          </button>
        </div>
      )}
    </li>
  );
}
