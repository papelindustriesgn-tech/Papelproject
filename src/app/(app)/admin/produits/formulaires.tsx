"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterConditionnement, definirPrix, modifierProduit } from "./actions";

export const LIBELLES_NIVEAUX: Record<string, string> = {
  papel: "Prix Papel (distributeur)",
  grossiste: "Conseillé grossiste → semi-grossiste",
  semi_grossiste: "Conseillé semi-grossiste → détaillant",
  detaillant: "Conseillé au consommateur (PVC)",
};

export interface ProduitEditable {
  id: string;
  libelle: string;
  nb_mouchoirs: number;
  plis: number;
  longueur_mm: number;
  largeur_mm: number;
  grammage_g_m2_pli: number;
  taux_perte_ref: number;
}

export function FormulaireProduit({ p }: { p: ProduitEditable }) {
  const [etat, action, enCours] = useActionState(modifierProduit.bind(null, p.id), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const val = (cle: keyof ProduitEditable, defaut: string | number) => v[cle] ?? String(defaut).replace(".", ",");
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Libellé" name="libelle" defaultValue={v.libelle ?? p.libelle} erreur={e.libelle} />
        <Champ libelle="Mouchoirs par paquet" name="nb_mouchoirs" inputMode="numeric" defaultValue={val("nb_mouchoirs", p.nb_mouchoirs)} erreur={e.nb_mouchoirs} />
        <Champ libelle="Plis" name="plis" inputMode="numeric" defaultValue={val("plis", p.plis)} erreur={e.plis} />
        <Champ libelle="Longueur (mm)" name="longueur_mm" inputMode="decimal" defaultValue={val("longueur_mm", p.longueur_mm)} erreur={e.longueur_mm} />
        <Champ libelle="Largeur (mm)" name="largeur_mm" inputMode="decimal" defaultValue={val("largeur_mm", p.largeur_mm)} erreur={e.largeur_mm} />
        <Champ libelle="Grammage par pli (g/m²)" name="grammage_g_m2_pli" inputMode="decimal" defaultValue={val("grammage_g_m2_pli", p.grammage_g_m2_pli)} erreur={e.grammage_g_m2_pli} />
        <Champ
          libelle="Pertes de référence (%)"
          name="taux_perte_pct"
          inputMode="decimal"
          defaultValue={v.taux_perte_pct ?? String(Math.round(p.taux_perte_ref * 10000) / 100).replace(".", ",")}
          erreur={e.taux_perte_pct}
        />
      </div>
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
        Enregistrer les caractéristiques
      </Bouton>
    </form>
  );
}

export function FormulaireConditionnement({ produitId }: { produitId: string }) {
  const [etat, action, enCours] = useActionState(ajouterConditionnement.bind(null, produitId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Champ libelle="Nouveau colis : paquets par colis" name="paquets_par_colis" inputMode="numeric" defaultValue={etat.ok ? "" : etat.valeurs?.paquets_par_colis} erreur={etat.erreurs?.paquets_par_colis} />
      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        Ajouter
      </Bouton>
      {etat.message && (
        <div className="w-full">
          <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>
        </div>
      )}
    </form>
  );
}

export function FormulairePrix({ produitId, dateDuJour }: { produitId: string; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(definirPrix.bind(null, produitId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Niveau" name="niveau" defaultValue={v.niveau ?? "papel"} erreur={etat.erreurs?.niveau}>
          {Object.entries(LIBELLES_NIVEAUX).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Selection>
        <Champ libelle="Prix du paquet (GNF)" name="prix_paquet_gnf" inputMode="numeric" defaultValue={v.prix_paquet_gnf} erreur={etat.erreurs?.prix_paquet_gnf} />
        <Champ libelle="À partir du" name="date_debut" type="date" defaultValue={v.date_debut ?? dateDuJour} erreur={etat.erreurs?.date_debut} />
        <Champ libelle="Note" name="note" defaultValue={v.note} erreur={etat.erreurs?.note} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Définir le nouveau prix
      </Bouton>
    </form>
  );
}
