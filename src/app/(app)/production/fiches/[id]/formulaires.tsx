"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { ajouterArret, ajouterConsommation, ajouterOperateurPresent, ajouterProduction, enregistrerOperateurs, modifierEnTete, validerFiche } from "../../actions";

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
      <Selection libelle="Produit et format de colis" name="conditionnement_id" value={condId} onChange={(ev) => setCondId(ev.target.value)} erreur={e.conditionnement_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {conditionnements.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Colis fermés" name="colis" inputMode="numeric" placeholder="0" defaultValue={v.colis} erreur={e.colis} className="basis-28 flex-1" aide={cond ? `1 colis = ${cond.paquetsParColis} paquets` : "Choisissez d'abord le produit"} />
      <Champ libelle="Paquets hors colis" name="paquets_vrac" inputMode="numeric" placeholder="0" defaultValue={v.paquets_vrac} erreur={e.paquets_vrac} className="basis-28 flex-1" aide="Paquets pas encore mis en colis" />
      <Champ libelle="Déchets (kg)" name="rebuts_kg" inputMode="decimal" placeholder="0" defaultValue={v.rebuts_kg} erreur={e.rebuts_kg} className="basis-28 flex-1" aide="Papier jeté, pesé" />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Ajouter cette production"}
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
      <Selection libelle="Quoi ?" name="article_id" value={articleId} onChange={(ev) => setArticleId(ev.target.value)} erreur={e.article_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {articles.map((a) => (
          <option key={a.id} value={a.id}>
            {a.libelle}
          </option>
        ))}
      </Selection>
      {article?.suiviParLot && (
        <Selection libelle="Numéro de la bobine" name="lot_id" defaultValue={v.lot_id ?? ""} erreur={e.lot_id} className="basis-56 flex-1">
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
      <Champ
        libelle={`Quantité utilisée${article ? ` (${article.unite})` : ""}`}
        name="quantite"
        inputMode="decimal"
        defaultValue={v.quantite}
        erreur={e.quantite}
        className="basis-28 flex-1"
        aide={article?.suiviParLot ? "Poids de papier déroulé sur la machine" : undefined}
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Ajouter"}
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
      <Selection libelle="Pourquoi ?" name="cause_id" defaultValue={v.cause_id ?? ""} erreur={e.cause_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {causes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Combien de minutes ?" name="duree_min" inputMode="numeric" defaultValue={v.duree_min} erreur={e.duree_min} className="basis-24 flex-1" />
      <Champ libelle="À quelle heure ? (facultatif)" name="heure_debut" type="time" defaultValue={v.heure_debut} erreur={e.heure_debut} className="basis-28 flex-1" />
      <Champ libelle="Remarque (facultatif)" name="commentaire" defaultValue={v.commentaire} erreur={e.commentaire} className="basis-56 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Ajouter cet arrêt"}
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
            <input
              type="checkbox"
              name="operateurs"
              value={o.id}
              defaultChecked={presents.includes(o.id)}
              disabled={!modifiable}
              // Enregistré dès qu'on coche : pas de bouton à ne pas oublier.
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="size-5 accent-papel-700"
            />
            {o.libelle} <span className="text-sm text-gray-600">{o.equipe}</span>
          </label>
        ))}
      </div>
      {!operateurs.length && <p className="text-gray-700">La liste est vide : ajoutez les personnes ci-dessous, une seule fois. Elles seront proposées aux prochains postes.</p>}
      {modifiable && operateurs.length > 0 && <p className="text-sm text-gray-600">{enCours ? "Enregistrement…" : "Chaque case cochée est enregistrée tout de suite."}</p>}
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
      <Selection libelle="Ordre de production (facultatif)" name="of_id" defaultValue={v.of_id} disabled={!modifiable} className="basis-56 flex-1">
        <option value="">— Aucun —</option>
        {ordres.map((o) => (
          <option key={o.id} value={o.id}>
            {o.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Remarque sur le poste (facultatif)" name="notes" defaultValue={v.notes} disabled={!modifiable} erreur={etat.erreurs?.notes} className="basis-64 flex-1" />
      {modifiable && (
        <Bouton type="submit" variante="secondaire" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer ces informations"}
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
        En validant, les bobines et emballages utilisés <strong>sortent du stock</strong> et les paquets produits <strong>entrent en stock</strong>.
        Ensuite, la saisie ne peut plus être modifiée : vérifiez les étapes 1 à 4.
      </p>
      {avertissements.map((a) => (
        <p key={a} className="font-semibold text-amber-900">
          ⚠ {a}
        </p>
      ))}
      {!confirmer ? (
        <Bouton type="button" onClick={() => setConfirmer(true)} className="self-start">
          Terminer et valider
        </Bouton>
      ) : (
        <form action={action} className="flex flex-wrap gap-2">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Validation…" : "Oui, c'est juste : valider"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
            Non, je vérifie encore
          </Bouton>
        </form>
      )}
    </div>
  );
}

/** Ajouter une personne qui n'est pas encore dans la liste, sans quitter la saisie (elle est cochée présente). */
export function AjoutOperateur({ ficheId, equipeId, ouvert }: { ficheId: string; equipeId: string | null; ouvert: boolean }) {
  const [etat, action, enCours] = useActionState(ajouterOperateurPresent.bind(null, ficheId, equipeId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <details className="mt-3 rounded-xl border border-dashed border-gray-300 px-3" open={ouvert || (!!etat.message && !etat.ok)}>
      <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-papel-700">+ Ajouter une personne qui n&apos;est pas dans la liste</summary>
      <form action={action} className="flex flex-wrap items-end gap-2 pb-3" key={etat.ok ? etat.message : "saisie"}>
        <Retour etat={etat} />
        <Champ libelle="Prénom" name="prenom" defaultValue={v.prenom} className="basis-36 flex-1" autoComplete="off" />
        <Champ libelle="Nom" name="nom" defaultValue={v.nom} erreur={etat.erreurs?.nom} className="basis-36 flex-1" autoComplete="off" />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Ajout…" : "Ajouter et cocher présent"}
        </Bouton>
      </form>
    </details>
  );
}
