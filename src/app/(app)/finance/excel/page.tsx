import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { JEUX_EXCEL } from "@/lib/excel/jeux";
import { formaterDateHeure } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { revoquerCle } from "./actions";
import { FormulaireCle } from "./formulaire";

export const metadata: Metadata = { title: "Connexion Excel" };

/** Connexion Excel / outils comptables : données toujours à jour dans un classeur, sans ressaisie. */
export default async function PageExcel() {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await clientServeur();
  const { data: cles } = await supabase.from("cles_export").select("id, libelle, debut_cle, actif, created_at, derniere_utilisation").order("created_at", { ascending: false });

  return (
    <>
      <TitrePage titre="Connexion Excel" sousTitre="Vos chiffres dans Excel, mis à jour d'un clic — sans ressaisie" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="1. Créer une connexion">
          <FormulaireCle base={base} jeux={JEUX_EXCEL} />
        </Carte>
        <Carte titre="2. La brancher dans Excel">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Dans Excel : onglet <strong>Données</strong> › <strong>À partir du Web</strong>.
            </li>
            <li>Collez l&apos;adresse copiée à l&apos;étape 1, puis <strong>OK</strong>.</li>
            <li>
              Cliquez sur <strong>Charger</strong> : le tableau apparaît dans une feuille.
            </li>
            <li>
              Pour mettre à jour : <strong>Données</strong> › <strong>Actualiser tout</strong>.
            </li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            Fonctionne aussi avec Google Sheets (fonction <span className="font-mono">IMPORTDATA</span>), Power BI et les logiciels comptables qui
            importent un fichier CSV. Pour les écritures comptables (journaux ventes, achats, trésorerie au format SYSCOHADA), utilisez{" "}
            <Link href="/finance/exports" className="text-papel-700 underline">
              Exports comptables
            </Link>
            .
          </p>
        </Carte>
      </div>

      <Carte titre="Données disponibles" className="mt-4">
        <Tableau entetes={["Données", "Contenu", "Période"]}>
          {JEUX_EXCEL.map((j) => (
            <tr key={j.code}>
              <Cellule className="font-semibold">{j.libelle}</Cellule>
              <Cellule>{j.description}</Cellule>
              <Cellule>{j.periode ? "Depuis le 1er janvier (modifiable)" : "Aujourd'hui"}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>

      <Carte titre="Connexions existantes" className="mt-4">
        <Tableau entetes={["Nom", "Clé", "Créée le", "Dernière utilisation", "État", ""]}>
          {(cles ?? []).map((c) => (
            <tr key={c.id}>
              <Cellule className="font-semibold">{c.libelle}</Cellule>
              <Cellule className="font-mono text-sm">{c.debut_cle}…</Cellule>
              <Cellule>{formaterDateHeure(c.created_at)}</Cellule>
              <Cellule>{c.derniere_utilisation ? formaterDateHeure(c.derniere_utilisation) : "Jamais"}</Cellule>
              <Cellule>{c.actif ? "Active" : "Révoquée"}</Cellule>
              <Cellule>
                {c.actif && (
                  <form action={revoquerCle.bind(null, c.id)}>
                    <Bouton type="submit" variante="discret" className="text-red-700">
                      Révoquer
                    </Bouton>
                  </form>
                )}
              </Cellule>
            </tr>
          ))}
        </Tableau>
        {!(cles ?? []).length && <p className="py-3 text-gray-600">Aucune connexion pour le moment.</p>}
        <p className="mt-2 text-sm text-gray-600">Une clé révoquée cesse aussitôt de fonctionner. Ne partagez une adresse qu&apos;avec la personne qui en a besoin.</p>
      </Carte>
    </>
  );
}
