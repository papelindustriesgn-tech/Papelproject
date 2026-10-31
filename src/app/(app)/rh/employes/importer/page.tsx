import type { Metadata } from "next";
import { ImportCollage } from "@/components/donnees/import-collage";
import { Carte, TitrePage } from "@/components/ui";
import { DOUBLON_EMPLOYE, chargerImportEmployes } from "@/lib/rh/import";
import { clientServeur } from "@/lib/supabase/serveur";
import { importerEmployes } from "../../actions";

export const metadata: Metadata = { title: "Coller depuis Excel" };

/** Saisie de tout le personnel en une fois, depuis une liste Excel existante. */
export default async function ImporterEmployes() {
  const supabase = await clientServeur();
  const { colonnes, existants } = await chargerImportEmployes(supabase);
  return (
    <>
      <TitrePage
        titre="Ajouter plusieurs employés"
        fil={[{ libelle: "Employés", href: "/rh/employes" }]}
        sousTitre="Votre liste du personnel est dans Excel ? Copiez-la, collez-la ici : tout le monde est créé d'un coup, avec son matricule."
      />
      <Carte>
        <ImportCollage colonnes={colonnes} existants={existants} doublonSur={DOUBLON_EMPLOYE} action={importerEmployes} nomModele="modele-employes" quoi={["employé", "employés"]} />
      </Carte>
    </>
  );
}
