"use client";

import { useActionState, useState, useTransition } from "react";
import { Bouton, Champ, Message, Selection } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { MODES_PAIEMENT_SALAIRE, STATUTS_PRESENCE } from "@/lib/rh/libelles";
import { creerAbsence, deciderAbsence, enregistrerEmploye, enregistrerPresences, enregistrerSortie, modifierBulletin, preparerPaie, validerPaie } from "./actions";

export interface Option {
  id: string;
  libelle: string;
}

function Retour({ etat }: { etat: EtatFormulaire }) {
  if (!etat.message) return null;
  return <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>;
}

// -----------------------------------------------------------------------------
// Dossier de l'employé (création et modification)
// -----------------------------------------------------------------------------
export interface DonneesEmploye {
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string | null;
  telephone: string;
  adresse: string;
  departement_id: string | null;
  fonction_id: string | null;
  type_contrat_id: string | null;
  date_embauche: string;
  date_fin_contrat: string | null;
  salaire_base_gnf: number;
  numero_cnss: string;
  mode_paiement: string;
  compte_paiement: string;
  notes: string;
}

export function FormulaireEmploye({ id, initial, departements, fonctions, contrats }: { id: string | null; initial?: DonneesEmploye; departements: Option[]; fonctions: Option[]; contrats: Option[] }) {
  const [etat, action, enCours] = useActionState(enregistrerEmploye.bind(null, id), ETAT_INITIAL);
  const v = (cle: keyof DonneesEmploye, defaut = "") => etat.valeurs?.[cle] ?? (initial?.[cle] == null ? defaut : String(initial[cle]));
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Retour etat={etat} />
      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Identité</legend>
        <Champ libelle="Nom" name="nom" defaultValue={v("nom")} erreur={e.nom} required />
        <Champ libelle="Prénom" name="prenom" defaultValue={v("prenom")} erreur={e.prenom} />
        <Selection libelle="Sexe" name="sexe" defaultValue={v("sexe")}>
          <option value="">—</option>
          <option value="F">Femme</option>
          <option value="M">Homme</option>
        </Selection>
        <Champ libelle="Date de naissance" name="date_naissance" type="date" defaultValue={v("date_naissance")} erreur={e.date_naissance} />
        <Champ libelle="Téléphone" name="telephone" type="tel" inputMode="tel" defaultValue={v("telephone")} erreur={e.telephone} />
        <Champ libelle="Adresse / quartier" name="adresse" defaultValue={v("adresse")} className="sm:col-span-2 lg:col-span-3" />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Poste et contrat</legend>
        <Selection libelle="Service" name="departement_id" defaultValue={v("departement_id")}>
          <option value="">—</option>
          {departements.map((o) => (
            <option key={o.id} value={o.id}>{o.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Fonction" name="fonction_id" defaultValue={v("fonction_id")}>
          <option value="">—</option>
          {fonctions.map((o) => (
            <option key={o.id} value={o.id}>{o.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Type de contrat" name="type_contrat_id" defaultValue={v("type_contrat_id")}>
          <option value="">—</option>
          {contrats.map((o) => (
            <option key={o.id} value={o.id}>{o.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Date d'embauche" name="date_embauche" type="date" defaultValue={v("date_embauche")} erreur={e.date_embauche} required />
        <Champ libelle="Fin du contrat (si CDD)" name="date_fin_contrat" type="date" defaultValue={v("date_fin_contrat")} erreur={e.date_fin_contrat} />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Paie</legend>
        <Champ libelle="Salaire de base mensuel (GNF)" name="salaire_base_gnf" inputMode="numeric" defaultValue={v("salaire_base_gnf", "0")} erreur={e.salaire_base_gnf} />
        <Champ libelle="N° CNSS" name="numero_cnss" defaultValue={v("numero_cnss")} />
        <Selection libelle="Paiement du salaire" name="mode_paiement" defaultValue={v("mode_paiement", "especes")}>
          {Object.entries(MODES_PAIEMENT_SALAIRE).map(([val, l]) => (
            <option key={val} value={val}>{l}</option>
          ))}
        </Selection>
        <Champ libelle="N° de compte / mobile money" name="compte_paiement" defaultValue={v("compte_paiement")} />
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-semibold text-gray-700">Notes</label>
        <textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={v("notes")} className="rounded border border-gray-300 px-3 py-2" />
      </div>
      <Bouton type="submit" disabled={enCours} className="self-start">
        {id ? "Enregistrer le dossier" : "Créer l'employé"}
      </Bouton>
    </form>
  );
}

export function FormulaireSortie({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(enregistrerSortie.bind(null, id), ETAT_INITIAL);
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      <Retour etat={etat} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Champ libelle="Date de sortie" name="date_sortie" type="date" defaultValue={etat.valeurs?.date_sortie} erreur={e.date_sortie} />
        <Champ libelle="Motif" name="motif_sortie" defaultValue={etat.valeurs?.motif_sortie} erreur={e.motif_sortie} className="sm:col-span-2" placeholder="Démission, fin de CDD, licenciement…" />
      </div>
      <Bouton type="submit" variante="danger" disabled={enCours} className="self-start">
        Enregistrer la sortie
      </Bouton>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Feuille de présence du jour
// -----------------------------------------------------------------------------
export interface LignePresence {
  id: string;
  matricule: string;
  nom: string;
  fonction: string;
  statut: string | null;
  heuresSup: number;
  note: string;
  /** Absence approuvée ce jour-là : proposée en « Congé ». */
  absenceApprouvee: string | null;
}

export function FeuillePresence({ jour, lignes }: { jour: string; lignes: LignePresence[] }) {
  const [etat, action, enCours] = useActionState(enregistrerPresences.bind(null, jour), ETAT_INITIAL);
  const [statuts, setStatuts] = useState<Record<string, string>>(() => Object.fromEntries(lignes.map((l) => [l.id, l.statut ?? (l.absenceApprouvee ? "conge" : "")])));
  const nonSaisis = lignes.filter((l) => !statuts[l.id]).length;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Retour etat={etat} />
      <div className="flex flex-wrap items-center gap-2">
        <Bouton type="button" variante="secondaire" onClick={() => setStatuts((s) => Object.fromEntries(lignes.map((l) => [l.id, s[l.id] || "present"])))}>
          Tous les autres présents
        </Bouton>
        <span className="text-sm text-gray-600">{nonSaisis ? `${nonSaisis} employé(s) sans statut` : "Tout le monde a un statut."}</span>
      </div>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {lignes.map((l) => (
          <li key={l.id} className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-center">
            <div className="min-w-0 md:w-64">
              <div className="font-semibold text-gray-900">{l.nom}</div>
              <div className="text-sm text-gray-500">
                {l.matricule}
                {l.fonction && ` · ${l.fonction}`}
              </div>
              {l.absenceApprouvee && <div className="text-sm font-medium text-sky-800">Absence approuvée : {l.absenceApprouvee}</div>}
            </div>
            <input type="hidden" name={`statut_${l.id}`} value={statuts[l.id] ?? ""} />
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Statut de ${l.nom}`}>
              {Object.entries(STATUTS_PRESENCE).map(([code, s]) => {
                const choisi = statuts[l.id] === code;
                const couleur = { present: "border-green-600 bg-green-600", retard: "border-amber-500 bg-amber-500", absent: "border-red-600 bg-red-600", conge: "border-sky-600 bg-sky-600", repos: "border-gray-500 bg-gray-500" }[code];
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={choisi}
                    onClick={() => setStatuts((x) => ({ ...x, [l.id]: code }))}
                    className={`min-h-11 rounded-full border px-3 text-sm font-semibold md:min-h-9 ${choisi ? `${couleur} text-white` : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    {s.libelle.split(" /")[0]}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 md:ml-auto">
              <label className="text-sm text-gray-600" htmlFor={`hs_${l.id}`}>
                Heures sup.
              </label>
              <input
                id={`hs_${l.id}`}
                name={`hs_${l.id}`}
                inputMode="decimal"
                defaultValue={l.heuresSup ? String(l.heuresSup).replace(".", ",") : ""}
                aria-invalid={etat.erreurs?.[`hs_${l.id}`] ? true : undefined}
                className={`min-h-11 w-20 rounded border px-2 md:min-h-9 ${etat.erreurs?.[`hs_${l.id}`] ? "border-red-600" : "border-gray-300"}`}
              />
              <input name={`note_${l.id}`} defaultValue={l.note} placeholder="Note" maxLength={200} className="min-h-11 w-40 rounded border border-gray-300 px-2 md:min-h-9" aria-label={`Note pour ${l.nom}`} />
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 -mx-3 border-t border-gray-200 bg-white/95 px-3 py-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Bouton type="submit" disabled={enCours} className="w-full md:w-auto">
          Enregistrer la feuille du jour
        </Bouton>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Congés et absences
// -----------------------------------------------------------------------------
export function FormulaireAbsence({ employes, types }: { employes: Option[]; types: Option[] }) {
  const [etat, action, enCours] = useActionState(creerAbsence, ETAT_INITIAL);
  const v = etat.ok ? {} : (etat.valeurs ?? {});
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" key={etat.ok ? etat.valeurs?.jeton : "f"}>
      <Retour etat={etat} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selection libelle="Employé" name="employe_id" defaultValue={v.employe_id ?? ""} erreur={e.employe_id}>
          <option value="">— Choisir —</option>
          {employes.map((o) => (
            <option key={o.id} value={o.id}>{o.libelle}</option>
          ))}
        </Selection>
        <Selection libelle="Type" name="type_absence_id" defaultValue={v.type_absence_id ?? ""} erreur={e.type_absence_id}>
          <option value="">— Choisir —</option>
          {types.map((o) => (
            <option key={o.id} value={o.id}>{o.libelle}</option>
          ))}
        </Selection>
        <Champ libelle="Du" name="du" type="date" defaultValue={v.du} erreur={e.du} />
        <Champ libelle="Au (inclus)" name="au" type="date" defaultValue={v.au} erreur={e.au} />
        <Champ libelle="Motif" name="motif" defaultValue={v.motif} className="sm:col-span-2 lg:col-span-4" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Bouton type="submit" disabled={enCours}>
          Enregistrer la demande
        </Bouton>
        <Bouton type="submit" name="approuver" value="1" variante="secondaire" disabled={enCours}>
          Enregistrer et approuver
        </Bouton>
      </div>
    </form>
  );
}

export function BoutonsDecision({ id }: { id: string }) {
  const [enCours, lancer] = useTransition();
  const [message, setMessage] = useState<EtatFormulaire | null>(null);
  const decider = (d: "approuvee" | "refusee") => lancer(async () => setMessage(await deciderAbsence(id, d)));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bouton type="button" disabled={enCours} onClick={() => decider("approuvee")}>
        Approuver
      </Bouton>
      <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => decider("refusee")}>
        Refuser
      </Bouton>
      {message?.message && !message.ok && <span className="text-sm font-medium text-red-700">{message.message}</span>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Paie
// -----------------------------------------------------------------------------
export function FormulairePreparerPaie({ moisDefaut }: { moisDefaut: string }) {
  const [etat, action, enCours] = useActionState(preparerPaie, ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Retour etat={etat} />
      <div className="flex flex-wrap items-end gap-3">
        <Champ libelle="Mois" name="mois" type="month" defaultValue={etat.valeurs?.mois ?? moisDefaut} erreur={etat.erreurs?.mois} />
        <Bouton type="submit" disabled={enCours}>
          Préparer la paie
        </Bouton>
      </div>
      <p className="text-sm text-gray-600">Les heures supplémentaires et les absences non payées viennent des présences et des congés du mois. Vous pourrez ensuite ajouter primes et avances, puis valider.</p>
    </form>
  );
}

export function ModifBulletin({ id, primes, avances }: { id: string; primes: number; avances: number }) {
  const [etat, action, enCours] = useActionState(modifierBulletin.bind(null, id), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input name="primes_gnf" inputMode="numeric" defaultValue={primes ? String(primes) : ""} placeholder="Primes" aria-label="Primes (GNF)" className={`min-h-9 w-28 rounded border px-2 text-sm ${etat.erreurs?.primes_gnf ? "border-red-600" : "border-gray-300"}`} />
      <input name="avances_gnf" inputMode="numeric" defaultValue={avances ? String(avances) : ""} placeholder="Avances" aria-label="Avances (GNF)" className={`min-h-9 w-28 rounded border px-2 text-sm ${etat.erreurs?.avances_gnf ? "border-red-600" : "border-gray-300"}`} />
      <Bouton type="submit" variante="secondaire" disabled={enCours} className="md:min-h-9">
        Recalculer
      </Bouton>
      {etat.message && <span className={`text-xs font-medium ${etat.ok ? "text-green-800" : "text-red-700"}`}>{etat.message}</span>}
    </form>
  );
}

export function BoutonValiderPaie({ mois }: { mois: string }) {
  const [enCours, lancer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bouton
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!confirm("Valider la paie ? Les bulletins ne pourront plus être modifiés.")) return;
          lancer(async () => setErreur((await validerPaie(mois))?.message ?? null));
        }}
      >
        Valider la paie du mois
      </Bouton>
      {erreur && <span className="text-sm font-medium text-red-700">{erreur}</span>}
    </div>
  );
}
