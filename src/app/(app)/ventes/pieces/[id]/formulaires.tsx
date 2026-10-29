"use client";

import { useActionState, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { CANAUX_RELANCE } from "@/lib/ventes/libelles";
import { ajouterLigne, enregistrerPaiement, enregistrerRelance, enregistrerRemboursement, modifierQuantiteLigne, modifierRetourStock, remettreDotation, validerPiece } from "../../actions";

type Option = { id: string; libelle: string };

function Retour({ etat }: { etat: EtatFormulaire }) {
  if (!etat.message) return null;
  return (
    <div className="w-full">
      <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>
    </div>
  );
}

export function FormulaireLigne({ pieceId, conditionnements }: { pieceId: string; conditionnements: (Option & { paquetsParColis: number })[] }) {
  const [etat, action, enCours] = useActionState(ajouterLigne.bind(null, pieceId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  const [cond, setCond] = useState(v.conditionnement_id ?? "");
  const c = conditionnements.find((x) => x.id === cond);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Produit et format de colis" name="conditionnement_id" value={cond} onChange={(ev) => setCond(ev.target.value)} erreur={e.conditionnement_id} className="basis-56 flex-1">
        <option value="">— Choisir —</option>
        {conditionnements.map((x) => (
          <option key={x.id} value={x.id}>
            {x.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Colis" name="quantite_colis" inputMode="numeric" defaultValue={v.quantite_colis} erreur={e.quantite_colis} className="basis-24 flex-1" aide={c ? `1 colis = ${c.paquetsParColis} paquets` : undefined} />
      <Champ libelle="Paquets en plus" name="paquets_vrac" inputMode="numeric" defaultValue={v.paquets_vrac} erreur={e.paquets_vrac} className="basis-24 flex-1" />
      <Bouton type="submit" disabled={enCours}>
        Ajouter
      </Bouton>
    </form>
  );
}

export function FormulaireQuantite({ ligneId, pieceId, colis, vrac }: { ligneId: string; pieceId: string; colis: number; vrac: number }) {
  const [etat, action, enCours] = useActionState(modifierQuantiteLigne.bind(null, ligneId, pieceId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <label className="sr-only" htmlFor={`c-${ligneId}`}>Colis</label>
      <input id={`c-${ligneId}`} name="quantite_colis" defaultValue={colis} inputMode="numeric" className="min-h-11 w-20 rounded border border-gray-300 px-2 md:min-h-9" aria-label="Colis" />
      <span className="text-sm">colis +</span>
      <input name="paquets_vrac" defaultValue={vrac} inputMode="numeric" className="min-h-11 w-16 rounded border border-gray-300 px-2 md:min-h-9" aria-label="Paquets en plus" />
      <span className="text-sm">paq.</span>
      <Bouton type="submit" variante="discret" disabled={enCours}>
        OK
      </Bouton>
      {etat.erreurs && <span className="text-sm text-red-700">{Object.values(etat.erreurs)[0]}</span>}
      {etat.message && !etat.ok && <span className="text-sm text-red-700">{etat.message}</span>}
    </form>
  );
}

export function BoutonValiderPiece({
  pieceId,
  typePiece,
  libelle,
  confirmation,
  bloque,
}: {
  pieceId: string;
  typePiece: "devis" | "commande" | "facture" | "avoir";
  libelle: string;
  /** Conséquences à confirmer avant de valider (avoir : solde client et stock). */
  confirmation?: string[];
  /** Validation impossible en l'état (le motif est affiché à côté). */
  bloque?: boolean;
}) {
  const [etat, action, enCours] = useActionState(validerPiece.bind(null, pieceId, typePiece), ETAT_INITIAL);
  const [aConfirmer, setAConfirmer] = useState(false);
  if (confirmation && !aConfirmer) {
    return (
      <div className="flex flex-col gap-2">
        {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
        <Bouton type="button" disabled={bloque} onClick={() => setAConfirmer(true)} className="self-start">
          {libelle}
        </Bouton>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
      {confirmation && (
        <div role="alertdialog" aria-label="Confirmer la validation" className="rounded-xl bg-amber-50 p-3 text-gray-900">
          <p className="font-semibold">En validant, définitivement :</p>
          <ul className="mt-1 list-disc pl-5">
            {confirmation.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Bouton type="submit" disabled={enCours || bloque}>
          {enCours ? "Validation…" : confirmation ? "Confirmer la validation" : libelle}
        </Bouton>
        {confirmation && (
          <Bouton type="button" variante="discret" disabled={enCours} onClick={() => setAConfirmer(false)}>
            Revenir
          </Bouton>
        )}
      </div>
    </form>
  );
}

/** Avoir : paquets de la ligne qui reviennent physiquement à l'usine (0 = avoir purement financier). */
export function FormulaireRetourStock({ ligneId, pieceId, valeur, max }: { ligneId: string; pieceId: string; valeur: number; max: number }) {
  const [etat, action, enCours] = useActionState(modifierRetourStock.bind(null, ligneId, pieceId), ETAT_INITIAL);
  const inutile = max === 0 && valeur === 0;
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input
        name="retour_stock_paquets"
        defaultValue={valeur}
        inputMode="numeric"
        disabled={inutile}
        className="min-h-11 w-20 rounded border border-gray-300 px-2 disabled:bg-gray-100 md:min-h-9"
        aria-label="Paquets qui reviennent en stock"
      />
      <span className="text-sm">paq. (max {max})</span>
      {!inutile && (
        <Bouton type="submit" variante="discret" disabled={enCours}>
          OK
        </Bouton>
      )}
      {etat.erreurs && <span className="text-sm text-red-700">{Object.values(etat.erreurs)[0]}</span>}
      {etat.message && !etat.ok && <span className="text-sm text-red-700">{etat.message}</span>}
    </form>
  );
}

function FormulaireReglement({
  action: actionServeur,
  modes,
  montant,
  dateDuJour,
  cle,
  libelleBouton,
  variante = "principal",
}: {
  action: (e: EtatFormulaire, fd: FormData) => Promise<EtatFormulaire>;
  modes: Option[];
  montant: number;
  dateDuJour: string;
  cle: string;
  libelleBouton: string;
  variante?: "principal" | "secondaire";
}) {
  const [etat, action, enCours] = useActionState(actionServeur, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      {/* Clé de cette saisie : identique en cas de double clic, renouvelée par la page après l'enregistrement. */}
      <input type="hidden" name="cle" value={cle} />
      <Champ libelle="Montant (GNF)" name="montant_gnf" inputMode="numeric" defaultValue={v.montant_gnf ?? String(montant)} erreur={e.montant_gnf} className="basis-36 flex-1" />
      <Selection libelle="Mode" name="mode_id" defaultValue={v.mode_id ?? modes[0]?.id ?? ""} erreur={e.mode_id} className="basis-40 flex-1">
        {modes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Date" name="date_paiement" type="date" defaultValue={v.date_paiement ?? dateDuJour} max={dateDuJour} erreur={e.date_paiement} className="basis-36 flex-1" />
      <Champ libelle="Référence (n° de transaction, chèque…)" name="reference" defaultValue={v.reference} erreur={e.reference ?? e.cle} className="basis-48 flex-1" />
      <Bouton type="submit" variante={variante} disabled={enCours}>
        {enCours ? "Enregistrement…" : libelleBouton}
      </Bouton>
    </form>
  );
}

export function FormulairePaiement({ factureId, modes, reste, dateDuJour, cle }: { factureId: string; modes: Option[]; reste: number; dateDuJour: string; cle: string }) {
  return <FormulaireReglement action={enregistrerPaiement.bind(null, factureId)} modes={modes} montant={reste} dateDuJour={dateDuJour} cle={cle} libelleBouton="Enregistrer le paiement" />;
}

export function FormulaireRemboursement({ factureId, modes, credit, dateDuJour, cle }: { factureId: string; modes: Option[]; credit: number; dateDuJour: string; cle: string }) {
  return (
    <FormulaireReglement
      action={enregistrerRemboursement.bind(null, factureId)}
      modes={modes}
      montant={credit}
      dateDuJour={dateDuJour}
      cle={cle}
      libelleBouton="Enregistrer le remboursement"
      variante="secondaire"
    />
  );
}

export function FormulaireDotation({ dotationId, conditionnements, reste }: { dotationId: string; conditionnements: (Option & { paquetsParColis: number })[]; reste: number }) {
  const [etat, action, enCours] = useActionState(remettreDotation.bind(null, dotationId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const premier = conditionnements[0];
  const suggestion = premier ? Math.floor(reste / premier.paquetsParColis) * premier.paquetsParColis : 0;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Colis" name="conditionnement_id" defaultValue={v.conditionnement_id ?? premier?.id ?? ""} erreur={etat.erreurs?.conditionnement_id} className="basis-40 flex-1">
        {conditionnements.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </Selection>
      <Champ libelle="Paquets remis" name="paquets" inputMode="numeric" defaultValue={v.paquets ?? (suggestion > 0 ? String(suggestion) : "")} erreur={etat.erreurs?.paquets} className="basis-28 flex-1" aide="De préférence en colis complets" />
      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        Remettre
      </Bouton>
    </form>
  );
}

export function FormulaireRelance({ factureId }: { factureId: string }) {
  const [etat, action, enCours] = useActionState(enregistrerRelance.bind(null, factureId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Retour etat={etat} />
      <Selection libelle="Canal" name="canal" defaultValue={v.canal ?? "telephone"} className="basis-36 flex-1">
        {Object.entries(CANAUX_RELANCE).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </Selection>
      <Champ libelle="Promesse de paiement le" name="promesse_date" type="date" defaultValue={v.promesse_date} erreur={etat.erreurs?.promesse_date} className="basis-36 flex-1" />
      <Champ libelle="Compte rendu" name="note" defaultValue={v.note} erreur={etat.erreurs?.note} className="basis-56 flex-1" />
      <Bouton type="submit" variante="secondaire" disabled={enCours}>
        Enregistrer la relance
      </Bouton>
    </form>
  );
}
