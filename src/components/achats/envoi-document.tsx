"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enregistrerDocument, lienDocument } from "@/app/(app)/achats/actions";
import { clientNavigateur } from "@/lib/supabase/navigateur";

/** Envoi d'un document (PDF ou photo, 10 Mo maximum) vers le stockage privé, puis enregistrement de la fiche. */
export function EnvoiDocument({ objetType, objetId, types }: { objetType: "bon_commande" | "conteneur"; objetId: string; types: { id: string; libelle: string }[] }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (fichier: File | undefined) => {
    if (!fichier) return;
    if (fichier.size > 10 * 1024 * 1024) return setMessage("Fichier trop lourd (10 Mo maximum).");
    setEnCours(true);
    setMessage("Envoi en cours…");
    const nomPropre = fichier.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const chemin = `${objetType}/${objetId}/${crypto.randomUUID()}-${nomPropre}`;
    const { error } = await clientNavigateur().storage.from("documents-achats").upload(chemin, fichier, { contentType: fichier.type });
    if (error) {
      setEnCours(false);
      return setMessage("Envoi impossible : format accepté PDF, JPEG, PNG ou WebP.");
    }
    const r = await enregistrerDocument(objetType, objetId, { chemin, nom: fichier.name, taille: fichier.size, typeDocumentId: typeId || null });
    setEnCours(false);
    setMessage(r.message ?? null);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-gray-700">Type de document</span>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9">
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.libelle}</option>
          ))}
        </select>
      </label>
      <label className={`flex min-h-11 cursor-pointer items-center rounded px-4 font-semibold text-white ${enCours ? "bg-papel-300" : "bg-papel-700"}`}>
        Joindre un fichier
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={enCours} onChange={(e) => void envoyer(e.target.files?.[0])} />
      </label>
      {message && <span role="status" className="text-sm">{message}</span>}
    </div>
  );
}

export function LienTelechargement({ chemin, nom }: { chemin: string; nom: string }) {
  const ouvrir = async () => {
    const url = await lienDocument(chemin);
    if (url) window.open(url, "_blank", "noopener");
  };
  return (
    <button type="button" onClick={() => void ouvrir()} className="min-h-11 text-left font-semibold text-papel-700 underline">
      {nom}
    </button>
  );
}
