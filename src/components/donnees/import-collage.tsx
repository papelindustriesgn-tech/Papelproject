"use client";

import { CheckCircle2, ClipboardPaste, TriangleAlert } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Bouton, Message } from "@/components/ui";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/formulaires/etat";
import { analyserImport, cleDoublon, type ColonneImport, type Valeur } from "@/lib/import/collage";

/** Valeur lisible dans l'aperçu : le libellé d'un choix plutôt que son identifiant. */
function afficher(c: ColonneImport, v: Valeur): string {
  if (v === null) return "";
  if (c.type === "choix") return c.choix?.find((o) => o.valeur === v)?.libelles[0] ?? String(v);
  if (c.type === "date") return String(v).split("-").reverse().join("/");
  if (typeof v === "number") return v.toLocaleString("fr-FR");
  return String(v);
}

/**
 * « Coller depuis Excel » : on copie les lignes de son fichier, on les colle, l'aperçu montre chaque ligne
 * (prête ou avec l'erreur expliquée), puis un seul bouton crée toutes les lignes prêtes. Recoller est sans danger :
 * ce qui existe déjà est refusé (`doublonSur`).
 */
export function ImportCollage({
  colonnes,
  action,
  nomModele,
  doublonSur,
  existants,
  quoi,
}: {
  colonnes: ColonneImport[];
  action: (e: EtatFormulaire, fd: FormData) => Promise<EtatFormulaire>;
  nomModele: string;
  doublonSur: string[];
  existants: string[];
  /** Ce qu'on crée : [singulier, pluriel], ex. ["employé", "employés"]. */
  quoi: [string, string];
}) {
  const [texte, setTexte] = useState("");
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL);
  const analyse = useMemo(
    () => analyserImport(texte, colonnes, { doublon: cleDoublon(doublonSur), existants: new Set(existants) }),
    [texte, colonnes, doublonSur, existants],
  );
  const erreurs = analyse.lignes.length - analyse.valides.length;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-gray-700">
        <li>
          Dans Excel, mettez les colonnes dans cet ordre (ou gardez une ligne de titres) :{" "}
          <strong>{colonnes.map((c) => `${c.libelle}${c.obligatoire ? "*" : ""}`).join(" · ")}</strong>. * = obligatoire.
        </li>
        <li>Sélectionnez les lignes, copiez (Ctrl + C), puis collez ici (Ctrl + V).</li>
        <li>Vérifiez l&apos;aperçu, puis créez. Les lignes en erreur ne sont pas créées : corrigez-les et recollez-les.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <ExportCsv nomFichier={nomModele} entetes={colonnes.map((c) => c.libelle)} lignes={[colonnes.map((c) => c.exemple ?? "")]} libelle="Télécharger le modèle Excel" />
        <span className="self-center text-sm text-gray-600">Les bonnes colonnes, avec un exemple à remplacer.</span>
      </div>

      <form action={envoyer} className="flex flex-col gap-3">
        {etat.message && <Message ton={etat.ok ? "succes" : "erreur"}>{etat.message}</Message>}
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ClipboardPaste size={16} aria-hidden /> Collez vos lignes ici
          </span>
          <textarea
            name="texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={colonnes.map((c) => c.exemple ?? c.libelle).join("\t")}
            className="w-full rounded-xl border border-gray-300 p-3 font-mono text-sm"
          />
        </label>

        {analyse.lignes.length > 0 && (
          <>
            <p className="flex flex-wrap gap-x-4 gap-y-1 font-semibold" role="status">
              <span className="inline-flex items-center gap-1 text-green-800">
                <CheckCircle2 size={18} aria-hidden /> {analyse.valides.length} ligne(s) prête(s)
              </span>
              {erreurs > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <TriangleAlert size={18} aria-hidden /> {erreurs} ligne(s) à corriger
                </span>
              )}
              {analyse.entete && <span className="font-normal text-gray-600">Ligne de titres reconnue.</span>}
              {analyse.colonnesIgnorees.length > 0 && <span className="font-normal text-gray-600">Colonnes ignorées : {analyse.colonnesIgnorees.join(", ")}.</span>}
            </p>
            <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Ligne</th>
                    {colonnes.map((c) => (
                      <th key={c.cle} className="whitespace-nowrap px-2 py-2">
                        {c.libelle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyse.lignes.slice(0, 200).map((l) => (
                    <tr key={l.numero} className={l.erreurs.length ? "bg-red-50" : ""}>
                      <td className="px-2 py-1.5 align-top font-semibold text-gray-500">{l.numero}</td>
                      {l.erreurs.length ? (
                        <td colSpan={colonnes.length} className="px-2 py-1.5 text-red-800">
                          {l.erreurs.join(" ")}
                        </td>
                      ) : (
                        colonnes.map((c) => (
                          <td key={c.cle} className="whitespace-nowrap px-2 py-1.5">
                            {afficher(c, l.valeurs[c.cle])}
                          </td>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Bouton type="submit" disabled={enCours || analyse.valides.length === 0} className="self-start">
          {enCours ? "Création…" : analyse.valides.length ? `Créer ${analyse.valides.length} ${analyse.valides.length > 1 ? quoi[1] : quoi[0]}` : `Créer les ${quoi[1]}`}
        </Bouton>
      </form>
    </div>
  );
}
