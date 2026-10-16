"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { ajouterConditionnement, creerProduit, definirPrix, modifierProduit } from "./actions";

export interface Niveau {
  code: string;
  libelle: string;
}

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

export function FormulairePrix({ produitId, dateDuJour, niveaux }: { produitId: string; dateDuJour: string; niveaux: Niveau[] }) {
  const [etat, action, enCours] = useActionState(definirPrix.bind(null, produitId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Niveau" name="niveau" defaultValue={v.niveau ?? "papel"} erreur={etat.erreurs?.niveau}>
          {niveaux.map((n) => (
            <option key={n.code} value={n.code}>
              {n.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="Prix du paquet HT (GNF)" name="prix_paquet_gnf" inputMode="numeric" defaultValue={v.prix_paquet_gnf} erreur={etat.erreurs?.prix_paquet_gnf} />
        <Champ libelle="À partir du" name="date_debut" type="date" defaultValue={v.date_debut ?? dateDuJour} erreur={etat.erreurs?.date_debut} />
        <Champ libelle="Note" name="note" defaultValue={v.note} erreur={etat.erreurs?.note} />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Définir le nouveau prix
      </Bouton>
    </form>
  );
}

export function FormulaireNouveauProduit() {
  const [etat, action, enCours] = useActionState(creerProduit, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Code" name="code" required defaultValue={v.code} erreur={e.code} aide="Ex. : PETIT100" autoCapitalize="characters" />
        <Champ libelle="Libellé" name="libelle" required defaultValue={v.libelle} erreur={e.libelle} />
        <Champ libelle="Mouchoirs par paquet" name="nb_mouchoirs" inputMode="numeric" required defaultValue={v.nb_mouchoirs ?? "100"} erreur={e.nb_mouchoirs} />
        <Champ libelle="Plis" name="plis" inputMode="numeric" required defaultValue={v.plis ?? "3"} erreur={e.plis} />
        <Champ libelle="Longueur (mm)" name="longueur_mm" inputMode="decimal" required defaultValue={v.longueur_mm} erreur={e.longueur_mm} />
        <Champ libelle="Largeur (mm)" name="largeur_mm" inputMode="decimal" required defaultValue={v.largeur_mm} erreur={e.largeur_mm} />
        <Champ libelle="Grammage par pli (g/m²)" name="grammage_g_m2_pli" inputMode="decimal" required defaultValue={v.grammage_g_m2_pli ?? "13"} erreur={e.grammage_g_m2_pli} />
        <Champ libelle="Pertes de référence (%)" name="taux_perte_pct" inputMode="decimal" required defaultValue={v.taux_perte_pct ?? "5"} erreur={e.taux_perte_pct} />
        <Champ libelle="Paquets par colis (colis par défaut)" name="paquets_par_colis" inputMode="numeric" required defaultValue={v.paquets_par_colis} erreur={e.paquets_par_colis} />
        <Champ libelle="Prix Papel du paquet HT (GNF)" name="prix_paquet_gnf" inputMode="numeric" defaultValue={v.prix_paquet_gnf} erreur={e.prix_paquet_gnf} aide="Facultatif" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Créer le produit
      </Bouton>
    </form>
  );
}
