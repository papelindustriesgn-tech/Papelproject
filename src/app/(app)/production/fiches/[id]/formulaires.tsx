"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { ajouterArret, ajouterConsommation, ajouterProduction, enregistrerOperateurs, modifierEnTete, validerFiche } from "../../actions";

type Option = { id: string; libelle: string };

function Retour({ etat }: { etat: EtatFormulaire }) {
  if (!etat.message) return null;
  return (
    <div className="w-full">
      <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>
    </div>
  );
}

export function FormulaireProduction({ ficheId, conditionnements }: { ficheId: string; conditionnements: (Option & { paquetsParColis: number })[] }) {
  const [etat, action, enCours] = useActionState(ajouterProduction.bind(null, ficheId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const [condId, setCondId] = useState(v.conditionnement_id ?? "");
  const cond = conditionnements.find((c) => c.id === condId);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Produit et colis" name="conditionnement_id" value={condId} onChange={(ev) => setCondId(ev.target.value)} erreur={e.conditionnement_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {conditionnements.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Colis complets" name="colis" inputMode="numeric" defaultValue={v.colis} erreur={e.colis} className="basis-28 flex-1" aide={cond ? `1 colis = ${cond.paquetsParColis} paquets` : undefined} />
      <Champ libelle="Paquets en vrac" name="paquets_vrac" inputMode="numeric" defaultValue={v.paquets_vrac} erreur={e.paquets_vrac} className="basis-28 flex-1" />
      <Champ libelle="Rebuts (kg)" name="rebuts_kg" inputMode="decimal" defaultValue={v.rebuts_kg} erreur={e.rebuts_kg} className="basis-28 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        Ajouter
      </Bouton>
    </form>
  );
}

export function FormulaireConsommation({
  ficheId,
  articles,
  lots,
}: {
  ficheId: string;
  articles: (Option & { suiviParLot: boolean; unite: string })[];
  lots: { id: string; articleId: string; libelle: string }[];
}) {
  const [etat, action, enCours] = useActionState(ajouterConsommation.bind(null, ficheId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const [articleId, setArticleId] = useState(v.article_id ?? articles.find((a) => a.suiviParLot)?.id ?? "");
  const article = articles.find((a) => a.id === articleId);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Article" name="article_id" value={articleId} onChange={(ev) => setArticleId(ev.target.value)} erreur={e.article_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {articles.map((a) => (
          <option key={a.id} value={a.id}>
            {a.libelle}
          </option>
        ))}
      </Selection>
      {article?.suiviParLot && (
        <Selection libelle="Bobine" name="lot_id" defaultValue={v.lot_id ?? ""} erreur={e.lot_id} className="basis-56 flex-1">
          <option value="">— Choisir —</option>
          {lots
            .filter((l) => l.articleId === article.id)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.libelle}
              </option>
            ))}
        </Selection>
      )}
      <Champ libelle={`Quantité${article ? ` (${article.unite})` : ""}`} name="quantite" inputMode="decimal" defaultValue={v.quantite} erreur={e.quantite} className="basis-28 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        Ajouter
      </Bouton>
    </form>
  );
}

export function FormulaireArret({ ficheId, causes }: { ficheId: string; causes: Option[] }) {
  const [etat, action, enCours] = useActionState(ajouterArret.bind(null, ficheId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Cause" name="cause_id" defaultValue={v.cause_id ?? ""} erreur={e.cause_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {causes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Durée (min)" name="duree_min" inputMode="numeric" defaultValue={v.duree_min} erreur={e.duree_min} className="basis-24 flex-1" />
      <Champ libelle="Début" name="heure_debut" type="time" defaultValue={v.heure_debut} erreur={e.heure_debut} className="basis-28 flex-1" />
      <Champ libelle="Commentaire" name="commentaire" defaultValue={v.commentaire} erreur={e.commentaire} className="basis-56 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        Ajouter
      </Bouton>
    </form>
  );
}

export function FormulaireOperateurs({ ficheId, operateurs, presents, modifiable }: { ficheId: string; operateurs: (Option & { equipe: string })[]; presents: string[]; modifiable: boolean }) {
  const [etat, action, enCours] = useActionState(enregistrerOperateurs.bind(null, ficheId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Retour etat={etat} />
      <div className="grid gap-1 sm:grid-cols-2">
        {operateurs.map((o) => (
          <label key={o.id} className="flex min-h-11 items-center gap-2 rounded border border-gray-200 px-3">
            <input type="checkbox" name="operateurs" value={o.id} defaultChecked={presents.includes(o.id)} disabled={!modifiable} className="size-5 accent-papel-700" />
            {o.libelle} <span className="text-sm text-gray-600">{o.equipe}</span>
          </label>
        ))}
      </div>
      {!operateurs.length && <p className="text-gray-700">Aucun opérateur : ajoutez-les dans Listes de référence → Opérateurs.</p>}
      {modifiable && operateurs.length > 0 && (
        <Bouton type="submit" variante="secondaire" disabled={enCours} className="self-start">
          Enregistrer les présences
        </Bouton>
      )}
    </form>
  );
}

export function FormulaireEnTete({
  ficheId,
  equipes,
  ordres,
  valeurs,
  modifiable,
}: {
  ficheId: string;
  equipes: Option[];
  ordres: Option[];
  valeurs: { equipe_id: string; of_id: string; notes: string };
  modifiable: boolean;
}) {
  const [etat, action, enCours] = useActionState(modifierEnTete.bind(null, ficheId), ETAT_INITIAL);
  const v = { ...valeurs, ...(etat.ok ? {} : etat.valeurs) };
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Équipe" name="equipe_id" defaultValue={v.equipe_id} disabled={!modifiable} className="basis-40 flex-1">
        <option value="">— Non précisée —</option>
        {equipes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.libelle}
          </option>
        ))}
      </Selection>
      <Selection libelle="Ordre de fabrication" name="of_id" defaultValue={v.of_id} disabled={!modifiable} className="basis-56 flex-1">
        <option value="">— Aucun —</option>
        {ordres.map((o) => (
          <option key={o.id} value={o.id}>
            {o.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Notes du poste" name="notes" defaultValue={v.notes} disabled={!modifiable} erreur={etat.erreurs?.notes} className="basis-64 flex-1" />
      {modifiable && (
        <Bouton type="submit" variante="secondaire" disabled={enCours}>
          Enregistrer
        </Bouton>
      )}
    </form>
  );
}

export function BoutonValider({ ficheId, avertissements }: { ficheId: string; avertissements: string[] }) {
  const [etat, action, enCours] = useActionState(validerFiche.bind(null, ficheId), ETAT_INITIAL);
  const [confirmer, setConfirmer] = useState(false);
  if (etat.ok) return <Message ton="succes">{etat.message}</Message>;
  return (
    <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3">
      {etat.message && <Message ton="erreur">{etat.message}</Message>}
      <p>
        La validation sort les bobines et emballages du stock et entre les produits finis au coût de revient. <strong>Elle est définitive.</strong>
      </p>
      {avertissements.map((a) => (
        <p key={a} className="font-semibold text-amber-900">
          ⚠ {a}
        </p>
      ))}
      {!confirmer ? (
        <Bouton type="button" onClick={() => setConfirmer(true)} className="self-start">
          Valider la fiche
        </Bouton>
      ) : (
        <form action={action} className="flex flex-wrap gap-2">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Validation…" : "Oui, valider définitivement"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
            Annuler
          </Bouton>
        </form>
      )}
    </div>
  );
}
