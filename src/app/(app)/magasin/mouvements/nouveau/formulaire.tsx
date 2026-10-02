"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { afficherStock, TYPES_MOUVEMENT } from "@/lib/stocks/libelles";
import { enregistrerMouvement } from "../../actions";

export interface ArticleSaisie {
  id: string;
  code: string;
  libelle: string;
  unite: string;
  suivi_par_lot: boolean;
  quantite: number;
  paquets_par_colis: number | null;
}

export interface LotSaisie {
  id: string;
  article_id: string;
  numero_lot: string;
  poids_restant_kg: number;
}

const UNITE_SAISIE: Record<string, string> = { kg: "kg", paquet: "paquets", unite: "unités", rouleau: "rouleaux", litre: "litres", metre: "mètres" };

/** Saisie d'un mouvement : le formulaire s'adapte au type (entrée/sortie) et à l'article (lot, unité, colis). */
export function FormulaireMouvement({ articles, lots, articleInitial, dateDuJour }: { articles: ArticleSaisie[]; lots: LotSaisie[]; articleInitial?: string; dateDuJour: string }) {
  const [etat, action, enCours] = useActionState(enregistrerMouvement, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const [type, setType] = useState(v.type ?? "");
  const [articleId, setArticleId] = useState(v.article_id ?? articleInitial ?? "");
  const [sens, setSens] = useState(v.sens ?? "");
  const article = articles.find((a) => a.id === articleId);
  const def = TYPES_MOUVEMENT[type];
  const entree = def ? (def.sens === 0 ? sens === "entree" : def.sens > 0) : false;

  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="Type de mouvement" name="type" value={type} onChange={(ev) => setType(ev.target.value)} erreur={e.type}>
          <option value="">— Choisir —</option>
          {Object.entries(TYPES_MOUVEMENT)
            .filter(([, d]) => d.saisieManuelle)
            .map(([k, d]) => (
              <option key={k} value={k}>
                {d.libelle} {d.sens > 0 ? "(+)" : d.sens < 0 ? "(−)" : "(±)"}
              </option>
            ))}
        </Selection>
        {def?.sens === 0 && (
          <Selection libelle="Sens" name="sens" value={sens} onChange={(ev) => setSens(ev.target.value)} erreur={e.sens}>
            <option value="">— Choisir —</option>
            <option value="entree">Entrée (+)</option>
            <option value="sortie">Sortie (−)</option>
          </Selection>
        )}
        <Selection libelle="Article" name="article_id" value={articleId} onChange={(ev) => setArticleId(ev.target.value)} erreur={e.article_id}>
          <option value="">— Choisir —</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} – {a.libelle}
            </option>
          ))}
        </Selection>
        {article?.suivi_par_lot && (
          <Selection libelle="Bobine (n° de lot)" name="lot_id" defaultValue={v.lot_id ?? ""} erreur={e.lot_id}>
            <option value="">— Choisir —</option>
            {lots
              .filter((l) => l.article_id === article.id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.numero_lot} — reste {l.poids_restant_kg} kg
                </option>
              ))}
          </Selection>
        )}
        <Champ
          libelle={`Quantité${article ? ` (en ${UNITE_SAISIE[article.unite]})` : ""}`}
          name="quantite"
          inputMode="decimal"
          required
          defaultValue={v.quantite}
          erreur={e.quantite}
          aide={article ? `Stock actuel : ${afficherStock(article.quantite, article.unite, article.paquets_par_colis)}${article.paquets_par_colis ? ` — 1 colis = ${article.paquets_par_colis} paquets` : ""}` : undefined}
        />
        {entree && <Champ libelle={`Coût unitaire (GNF par ${article ? UNITE_SAISIE[article.unite].replace(/s$/, "") : "unité"})`} name="cout_unitaire_gnf" inputMode="decimal" defaultValue={v.cout_unitaire_gnf} erreur={e.cout_unitaire_gnf} aide="Facultatif : à défaut, coût moyen actuel" />}
        <Champ libelle="Date" name="date_operation" type="date" required defaultValue={v.date_operation ?? dateDuJour} max={dateDuJour} erreur={e.date_operation} />
        <Champ libelle="Motif / référence" name="motif" defaultValue={v.motif} erreur={e.motif} aide="Obligatoire pour une sortie diverse, un rebut ou un ajustement" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement…" : "Enregistrer le mouvement"}
      </Bouton>
    </form>
  );
}
