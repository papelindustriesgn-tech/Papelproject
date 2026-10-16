"use client";

import { useActionState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { UNITES_STOCK } from "@/lib/stocks/libelles";
import { creerArticle, modifierArticle } from "../actions";

export interface Categorie {
  id: string;
  libelle: string;
  famille: string;
}

const FAMILLES_SAISIE = [
  { valeur: "matiere_premiere", libelle: "Matière première" },
  { valeur: "emballage", libelle: "Emballage" },
  { valeur: "piece_detachee", libelle: "Pièce détachée" },
  { valeur: "autre", libelle: "Autre" },
];

export function FormulaireNouvelArticle({ categories }: { categories: Categorie[] }) {
  const [etat, action, enCours] = useActionState(creerArticle, ETAT_INITIAL);
  const v = etat.valeurs ?? {};
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Code" name="code" required defaultValue={v.code} erreur={e.code} aide="Ex. : EMB-CARTON-50" autoCapitalize="characters" />
        <Champ libelle="Libellé" name="libelle" required defaultValue={v.libelle} erreur={e.libelle} />
        <Selection libelle="Famille" name="famille" defaultValue={v.famille ?? ""} erreur={e.famille}>
          <option value="">— Choisir —</option>
          {FAMILLES_SAISIE.map((f) => (
            <option key={f.valeur} value={f.valeur}>
              {f.libelle}
            </option>
          ))}
        </Selection>
        <Selection libelle="Catégorie" name="categorie_id" defaultValue={v.categorie_id ?? ""} erreur={e.categorie_id}>
          <option value="">— Aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </Selection>
        <Selection libelle="Unité de stock (définitive)" name="unite" defaultValue={v.unite ?? ""} erreur={e.unite}>
          <option value="">— Choisir —</option>
          {UNITES_STOCK.map((u) => (
            <option key={u.valeur} value={u.valeur}>
              {u.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="Seuil d'alerte (dans l'unité de stock)" name="seuil_alerte" inputMode="decimal" defaultValue={v.seuil_alerte} erreur={e.seuil_alerte} />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="suivi_par_lot" defaultChecked={v.suivi_par_lot === "on"} className="size-5 accent-papel-700" />
        Suivi par lot (bobines jumbo : n° de lot, poids, grammage…) — unité kg obligatoire
      </label>
      {e.suivi_par_lot && <p className="text-sm font-medium text-red-700">{e.suivi_par_lot}</p>}
      <Champ libelle="Notes" name="notes" defaultValue={v.notes} erreur={e.notes} />
      <p className="text-sm text-gray-600">Les articles « produit fini » sont créés automatiquement pour chaque produit et chaque taille de colis (Administration → Produits et prix).</p>
      <Bouton type="submit" disabled={enCours} className="self-start">
        Créer l&apos;article
      </Bouton>
    </form>
  );
}

export function FormulaireArticle({
  id,
  article,
  categories,
}: {
  id: string;
  article: { libelle: string; categorie_id: string | null; seuil_alerte: number; notes: string };
  categories: Categorie[];
}) {
  const [etat, action, enCours] = useActionState(modifierArticle.bind(null, id), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Libellé" name="libelle" defaultValue={v.libelle ?? article.libelle} erreur={e.libelle} />
        <Selection libelle="Catégorie" name="categorie_id" defaultValue={v.categorie_id ?? article.categorie_id ?? ""} erreur={e.categorie_id}>
          <option value="">— Aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </Selection>
        <Champ libelle="Seuil d'alerte" name="seuil_alerte" inputMode="decimal" defaultValue={v.seuil_alerte ?? String(article.seuil_alerte).replace(".", ",")} erreur={e.seuil_alerte} />
        <Champ libelle="Notes" name="notes" defaultValue={v.notes ?? article.notes} erreur={e.notes} />
      </div>
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
        Enregistrer
      </Bouton>
    </form>
  );
}
