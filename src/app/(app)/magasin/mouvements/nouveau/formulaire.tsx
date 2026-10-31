"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { afficherStock, type DefinitionTypeMouvement, TYPES_MOUVEMENT } from "@/lib/stocks/libelles";
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

/** Un grand bouton à toucher : le cas et sa phrase d'explication. */
function ChoixType({ code, def, choisi, onChoisir }: { code: string; def: DefinitionTypeMouvement; choisi: boolean; onChoisir: (c: string) => void }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${choisi ? "border-papel-600 bg-papel-50" : "border-gray-200 bg-white"}`}>
      <input type="radio" name="type" value={code} checked={choisi} onChange={() => onChoisir(code)} className="mt-1 size-5 accent-papel-700" />
      <span>
        <span className="block font-semibold text-gray-900">
          {def.libelle} <span className="font-normal text-gray-500">{def.sens > 0 ? "(+)" : def.sens < 0 ? "(−)" : "(±)"}</span>
        </span>
        <span className="block text-sm text-gray-600">{def.explication}</span>
      </span>
    </label>
  );
}

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
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-700">1. Que se passe-t-il ?</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(TYPES_MOUVEMENT)
            .filter(([, d]) => d.saisieManuelle && d.courant)
            .map(([k, d]) => (
              <ChoixType key={k} code={k} def={d} choisi={type === k} onChoisir={setType} />
            ))}
        </div>
        <details className="mt-2" open={!!def && !def.courant}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-papel-700">Autres cas (d&apos;habitude faits automatiquement)</summary>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(TYPES_MOUVEMENT)
              .filter(([, d]) => d.saisieManuelle && !d.courant)
              .map(([k, d]) => (
                <ChoixType key={k} code={k} def={d} choisi={type === k} onChoisir={setType} />
              ))}
          </div>
        </details>
        {e.type && <p className="mt-1 text-sm font-semibold text-red-700">{e.type}</p>}
      </fieldset>
      {def?.sens === 0 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-semibold text-gray-700">Dans quel sens ?</legend>
          {[
            { v: "entree", t: "Il y en a en plus" },
            { v: "sortie", t: "Il en manque" },
          ].map((o) => (
            <label key={o.v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 ${sens === o.v ? "border-papel-600 bg-papel-50" : "border-gray-200"}`}>
              <input type="radio" name="sens" value={o.v} checked={sens === o.v} onChange={() => setSens(o.v)} className="size-5 accent-papel-700" />
              {o.t}
            </label>
          ))}
          {e.sens && <p className="w-full text-sm font-semibold text-red-700">{e.sens}</p>}
        </fieldset>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selection libelle="2. Quel article ?" name="article_id" value={articleId} onChange={(ev) => setArticleId(ev.target.value)} erreur={e.article_id}>
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
          libelle={`3. Combien ?${article ? ` (en ${UNITE_SAISIE[article.unite]})` : ""}`}
          name="quantite"
          inputMode="decimal"
          required
          defaultValue={v.quantite}
          erreur={e.quantite}
          aide={article ? `Stock actuel : ${afficherStock(article.quantite, article.unite, article.paquets_par_colis)}${article.paquets_par_colis ? ` — 1 colis = ${article.paquets_par_colis} paquets` : ""}` : undefined}
        />
        {entree && <Champ libelle={`Prix payé par ${article ? UNITE_SAISIE[article.unite].replace(/s$/, "") : "unité"}, en GNF (facultatif)`} name="cout_unitaire_gnf" inputMode="decimal" defaultValue={v.cout_unitaire_gnf} erreur={e.cout_unitaire_gnf} aide="Sert à calculer la valeur du stock. Vide : prix moyen actuel." />}
        <Champ libelle="Date" name="date_operation" type="date" required defaultValue={v.date_operation ?? dateDuJour} max={dateDuJour} erreur={e.date_operation} />
        <Champ
          libelle={type === "sortie" || type === "rebut" || type === "ajustement" ? "Pourquoi ?" : "Référence (facultatif)"}
          name="motif"
          defaultValue={v.motif}
          erreur={e.motif}
          aide={type === "sortie" || type === "rebut" || type === "ajustement" ? "Obligatoire : quelques mots suffisent." : "N° de bon du fournisseur, par exemple."}
        />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement…" : def ? (def.sens === 0 && !sens ? "Enregistrer" : entree ? "Ajouter au stock" : "Retirer du stock") : "Enregistrer"}
      </Bouton>
    </form>
  );
}
