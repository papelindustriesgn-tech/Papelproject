"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useTransition, useState } from "react";
import { Bouton, Champ, Selection } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { ICONES, INDICATEURS } from "@/lib/navigation/indicateurs";
import { enregistrerElement, enregistrerPromesse, supprimerElement } from "./actions";

export interface Ecran {
  href: string;
  libelle: string;
  appli: string;
}

export interface Element {
  id: string;
  genre: "action" | "etape" | "tache";
  libelle: string;
  description: string;
  ecran: string;
  icone: string;
  indicateur: string | null;
  urgent: boolean;
  seuil: number;
  ordre: number;
  actif: boolean;
}

function Retour({ etat }: { etat: EtatFormulaire }) {
  if (!etat.message) return null;
  return (
    <p role="status" className={`w-full text-sm font-medium ${etat.ok ? "text-green-800" : "text-red-700"}`}>
      {etat.message}
    </p>
  );
}

export function FormulairePromesse({ espace, promesse, modifiable }: { espace: string; promesse: string; modifiable: boolean }) {
  const [etat, action, enCours] = useActionState(enregistrerPromesse.bind(null, espace), ETAT_INITIAL);
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="promesse" className="text-sm font-semibold text-gray-700">
        Une phrase qui dit à quoi sert l&apos;application (affichée en haut de l&apos;écran d&apos;accueil)
      </label>
      <textarea
        id="promesse"
        name="promesse"
        defaultValue={etat.valeurs?.promesse ?? promesse}
        maxLength={300}
        rows={2}
        disabled={!modifiable}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      {etat.erreurs?.promesse && <p className="text-sm font-medium text-red-700">{etat.erreurs.promesse}</p>}
      {modifiable && (
        <div className="flex flex-wrap items-center gap-3">
          <Bouton type="submit" disabled={enCours}>
            Enregistrer la phrase
          </Bouton>
          <Retour etat={etat} />
        </div>
      )}
    </form>
  );
}

/** Liste déroulante des écrans de l'ERP, regroupés par application (la valeur actuelle reste proposée). */
function ChoixEcran({ ecrans, valeur, erreur, onChange }: { ecrans: Ecran[]; valeur: string; erreur?: string; onChange?: (v: string) => void }) {
  const applis = [...new Set(ecrans.map((e) => e.appli))];
  const connu = ecrans.some((e) => e.href === valeur);
  return (
    <Selection libelle="Écran ouvert" name="ecran" defaultValue={valeur} erreur={erreur} onChange={onChange ? (e) => onChange(e.target.value) : undefined}>
      <option value="">— Choisir —</option>
      {!connu && valeur && <option value={valeur}>{valeur}</option>}
      {applis.map((a) => (
        <optgroup key={a} label={a}>
          {ecrans
            .filter((e) => e.appli === a)
            .map((e) => (
              <option key={e.href} value={e.href}>
                {e.libelle}
              </option>
            ))}
        </optgroup>
      ))}
    </Selection>
  );
}

/** Une ligne réglable (bouton, étape ou « À faire ») ; sans `element`, c'est le formulaire d'ajout. */
export function FormulaireElement({ espace, genre, element, ecrans, modifiable, ordreSuivant }: { espace: string; genre: Element["genre"]; element?: Element; ecrans: Ecran[]; modifiable: boolean; ordreSuivant?: number }) {
  const [etat, action, enCours] = useActionState(enregistrerElement.bind(null, espace, element?.id ?? null), ETAT_INITIAL);
  const [suppression, lancer] = useTransition();
  const [messageSuppression, setMessageSuppression] = useState<string | null>(null);
  const v = (cle: string, defaut: string) => etat.valeurs?.[cle] ?? defaut;
  const e = etat.erreurs ?? {};
  // À l'ajout d'une ligne « À faire », choisir l'indicateur propose son écran et son libellé.
  const [indicateur, setIndicateur] = useState(element?.indicateur ?? "");
  const choisi = INDICATEURS.find((i) => i.code === indicateur);
  const cle = element ? element.id : `nouveau-${indicateur}`;

  return (
    <form action={action} className={`grid gap-2 border-b border-gray-100 py-3 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))] ${element && !element.actif ? "opacity-60" : ""}`}>
      <input type="hidden" name="genre" value={genre} />
      {genre === "tache" && (
        <Selection libelle="Ce qu'on compte" name="indicateur" defaultValue={v("indicateur", indicateur)} erreur={e.indicateur} onChange={(x) => setIndicateur(x.target.value)} className="lg:col-span-2" disabled={!modifiable}>
          <option value="">— Choisir —</option>
          {[...new Set(INDICATEURS.map((i) => i.domaine))].map((d) => (
            <optgroup key={d} label={d}>
              {INDICATEURS.filter((i) => i.domaine === d).map((i) => (
                <option key={i.code} value={i.code}>
                  {i.libelle}
                </option>
              ))}
            </optgroup>
          ))}
        </Selection>
      )}
      <Champ key={`l-${cle}`} libelle={genre === "tache" ? "Phrase affichée" : "Libellé"} name="libelle" defaultValue={v("libelle", element?.libelle ?? (choisi?.libelle ?? ""))} erreur={e.libelle} maxLength={80} disabled={!modifiable} className="lg:col-span-2" />
      {genre === "action" && <Champ libelle="Petite explication" name="description" defaultValue={v("description", element?.description ?? "")} erreur={e.description} maxLength={120} disabled={!modifiable} className="lg:col-span-2" />}
      <div key={`e-${cle}`} className="lg:col-span-2">
        <ChoixEcran ecrans={ecrans} valeur={v("ecran", element?.ecran ?? choisi?.ecran ?? "")} erreur={e.ecran} />
      </div>
      {genre === "action" && (
        <Selection libelle="Icône" name="icone" defaultValue={v("icone", element?.icone ?? "fiche")} disabled={!modifiable}>
          {ICONES.map((i) => (
            <option key={i.code} value={i.code}>
              {i.libelle}
            </option>
          ))}
        </Selection>
      )}
      {genre === "tache" && (
        <Champ libelle="Afficher à partir de" name="seuil" defaultValue={v("seuil", String(element?.seuil ?? 1))} erreur={e.seuil} aide="Nombre minimum pour afficher la ligne" disabled={!modifiable} />
      )}
      <Champ libelle="Ordre" name="ordre" defaultValue={v("ordre", String(element?.ordre ?? ordreSuivant ?? 1))} erreur={e.ordre} aide={genre === "action" ? "1 = bouton principal" : "1 = en premier"} disabled={!modifiable} />
      <div className="flex flex-wrap items-end gap-3 lg:col-span-6">
        {genre === "tache" && (
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <input type="checkbox" name="urgent" defaultChecked={element?.urgent ?? false} disabled={!modifiable} className="size-5 accent-papel-700" /> Urgent (en rouge)
          </label>
        )}
        {element && (
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <input type="checkbox" name="actif" defaultChecked={element.actif} disabled={!modifiable} className="size-5 accent-papel-700" /> Affiché
          </label>
        )}
        {modifiable && (
          <>
            <Bouton type="submit" variante={element ? "secondaire" : "principal"} disabled={enCours}>
              {element ? "Enregistrer" : "Ajouter"}
            </Bouton>
            {element && (
              <Bouton
                type="button"
                variante="discret"
                disabled={suppression}
                onClick={() => {
                  if (!confirm(`Supprimer « ${element.libelle} » ?`)) return;
                  lancer(async () => setMessageSuppression((await supprimerElement(espace, element.id)).message ?? null));
                }}
                aria-label={`Supprimer ${element.libelle}`}
              >
                <Trash2 size={16} /> Supprimer
              </Bouton>
            )}
          </>
        )}
        <Retour etat={etat} />
        {messageSuppression && <p className="text-sm font-medium text-red-700">{messageSuppression}</p>}
      </div>
    </form>
  );
}
