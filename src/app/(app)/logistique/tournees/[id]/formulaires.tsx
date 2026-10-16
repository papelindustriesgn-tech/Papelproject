"use client";

import { useActionState, useTransition, useState } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL } from "@/lib/formulaires/etat";
import { affecterLivraison, ajouterDepense, demarrerTournee, terminerTournee } from "../../actions";

/** Ajoute un bon au chargement ; affiche le refus (capacité dépassée…) sous le bouton. */
export function BoutonCharger({ tourneeId, livraisonId }: { tourneeId: string; livraisonId: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <Bouton
        variante="secondaire"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await affecterLivraison(tourneeId, livraisonId);
            setMessage(r.ok ? null : (r.message ?? null));
          })
        }
      >
        Charger
      </Bouton>
      {message && <p role="alert" className="mt-1 text-sm text-red-700">{message}</p>}
    </div>
  );
}

export function FormulaireDepart({ tourneeId }: { tourneeId: string }) {
  const [etat, action, enCours] = useActionState(demarrerTournee.bind(null, tourneeId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton="erreur">{etat.message}</Message></div>}
      <Champ libelle="Compteur au départ (km)" name="km_depart" inputMode="numeric" defaultValue={etat.valeurs?.km_depart} erreur={etat.erreurs?.km_depart} />
      <Bouton type="submit" disabled={enCours}>Chargement terminé : départ</Bouton>
    </form>
  );
}

export function FormulaireRetour({ tourneeId }: { tourneeId: string }) {
  const [etat, action, enCours] = useActionState(terminerTournee.bind(null, tourneeId), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton="erreur">{etat.message}</Message></div>}
      <Champ libelle="Compteur au retour (km)" name="km_retour" inputMode="numeric" defaultValue={etat.valeurs?.km_retour} erreur={etat.erreurs?.km_retour} />
      <Bouton type="submit" disabled={enCours}>Retour à l&apos;usine : clôturer</Bouton>
    </form>
  );
}

export function FormulaireDepense({ tourneeId, types }: { tourneeId: string; types: { id: string; libelle: string }[] }) {
  const [etat, action, enCours] = useActionState(ajouterDepense.bind(null, tourneeId), ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {etat.message && <div className="w-full"><Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message></div>}
      <Selection libelle="Dépense" name="type_id" defaultValue={v.type_id ?? ""} erreur={e.type_id} className="basis-44 flex-1">
        <option value="">— Choisir —</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>{t.libelle}</option>
        ))}
      </Selection>
      <Champ libelle="Montant (GNF)" name="montant_gnf" inputMode="numeric" defaultValue={v.montant_gnf} erreur={e.montant_gnf} className="basis-36 flex-1" />
      <Champ libelle="N° de reçu" name="reference" defaultValue={v.reference} className="basis-32 flex-1" />
      <Bouton type="submit" disabled={enCours}>Ajouter</Bouton>
    </form>
  );
}
