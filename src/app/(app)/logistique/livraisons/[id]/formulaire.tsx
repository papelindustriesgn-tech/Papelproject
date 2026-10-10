"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { imageSignature, ZoneSignature } from "@/components/logistique/signature";
import { Bouton, Champ, Message } from "@/components/ui";
import { lireNombre } from "@/lib/formulaires/nombres";
import { clientNavigateur } from "@/lib/supabase/navigateur";
import { compresserPhoto } from "@/lib/terrain/image";
import { lirePosition } from "@/lib/terrain/geo";
import { enregistrerRemise } from "../../actions";

interface LigneBl {
  id: string;
  libelle: string;
  paquets: number;
}

type Statut = "livree" | "partielle" | "refusee";

/** Saisie de la remise chez le client : résultat, réceptionnaire, signature, photo, position GPS, paquets rapportés. */
export function FormulaireRemise({ livraisonId, lignes }: { livraisonId: string; lignes: LigneBl[] }) {
  const router = useRouter();
  const [statut, setStatut] = useState<Statut>("livree");
  const [signee, setSignee] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; precisionM: number } | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState(false);

  const localiser = async () => {
    setGpsMessage("Recherche de la position…");
    try {
      const p = await lirePosition();
      setGps(p);
      setGpsMessage(`Position relevée (précision ${p.precisionM} m).`);
    } catch (e) {
      setGpsMessage((e as Error).message);
    }
  };

  const envoyerFichier = async (blob: Blob, nom: string, type: string) => {
    const chemin = `${livraisonId}/${crypto.randomUUID()}-${nom}`;
    const { error } = await clientNavigateur().storage.from("preuves-livraison").upload(chemin, blob, { contentType: type });
    if (error) throw new Error("Envoi de la preuve impossible : vérifiez la connexion.");
    return chemin;
  };

  // onSubmit (et non « action ») : en cas d'erreur, les saisies du chauffeur restent dans le formulaire.
  const valider = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    setEnCours(true);
    setMessage(null);
    setErreurs({});
    try {
      const avecSignature = statut !== "refusee" && signee;
      const signature = avecSignature ? await envoyerFichier((await imageSignature())!, "signature.png", "image/png") : null;
      const cheminPhoto = photo ? await envoyerFichier(await compresserPhoto(photo), "photo.jpg", "image/jpeg") : null;
      const r = await enregistrerRemise(livraisonId, {
        statut,
        receptionnaire: String(fd.get("receptionnaire") ?? ""),
        commentaire: String(fd.get("commentaire") ?? ""),
        signature,
        photo: cheminPhoto,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        precision: gps?.precisionM ?? null,
        retours: lignes.map((l) => ({ ligne_id: l.id, paquets: Math.round(lireNombre(String(fd.get(`retour_${l.id}`) ?? "")) ?? 0) })),
      });
      setErreurs(r.erreurs ?? {});
      if (r.message) setMessage({ ok: !!r.ok, texte: r.message });
      if (r.ok) router.refresh();
    } catch (e) {
      setMessage({ ok: false, texte: (e as Error).message });
    }
    setEnCours(false);
  };

  return (
    <form onSubmit={(ev) => void valider(ev)} className="flex flex-col gap-4">
      {message && <Message ton={message.ok ? "succes" : "erreur"}>{message.texte}</Message>}
      <fieldset>
        <legend className="mb-1 font-semibold">Résultat</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["livree", "Tout livré"],
              ["partielle", "Livré en partie"],
              ["refusee", "Refusé par le client"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 ${statut === v ? "border-papel-700 bg-papel-50 font-semibold" : "border-gray-300 bg-white"}`}>
              <input type="radio" name="statut" value={v} checked={statut === v} onChange={() => setStatut(v)} className="size-5 accent-papel-700" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      {statut === "partielle" && (
        <fieldset>
          <legend className="mb-1 font-semibold">Paquets rapportés à l&apos;usine</legend>
          {erreurs.retours && <p className="text-sm text-red-700">{erreurs.retours}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {lignes.map((l) => (
              <Champ key={l.id} libelle={`${l.libelle} (sur ${l.paquets} paquets)`} name={`retour_${l.id}`} inputMode="numeric" defaultValue="0" />
            ))}
          </div>
        </fieldset>
      )}

      {statut !== "refusee" && (
        <>
          <Champ libelle="Réceptionné par" name="receptionnaire" erreur={erreurs.receptionnaire} placeholder="Nom de la personne" />
          <div>
            <p className="mb-1 font-semibold">Signature du client</p>
            {erreurs.signature && <p className="text-sm text-red-700">{erreurs.signature}</p>}
            <ZoneSignature onChange={setSignee} />
          </div>
        </>
      )}

      <Champ libelle={statut === "refusee" ? "Motif du refus" : "Commentaire"} name="commentaire" erreur={erreurs.commentaire} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center rounded border border-papel-700 px-4 font-semibold text-papel-700">
          {photo ? "Photo prise ✓" : "Photo (facultatif)"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <Bouton type="button" variante="secondaire" onClick={() => void localiser()}>
          {gps ? "Position relevée ✓" : "Relever la position GPS"}
        </Bouton>
        {gpsMessage && <span role="status" className="text-sm">{gpsMessage}</span>}
      </div>

      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement…" : "Enregistrer la remise"}
      </Bouton>
    </form>
  );
}
