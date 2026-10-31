import type { Metadata } from "next";
import { ImportCollage } from "@/components/donnees/import-collage";
import { Carte, TitrePage } from "@/components/ui";
import { chargerImportClients, DOUBLON_CLIENT } from "@/lib/ventes/import";
import { importerClients } from "../../actions";

export const metadata: Metadata = { title: "Coller depuis Excel" };

/** Saisie de tous les clients en une fois, depuis une liste Excel existante. */
export default async function ImporterClients() {
  const { colonnes, existants } = await chargerImportClients();
  return (
    <>
      <TitrePage
        titre="Ajouter plusieurs clients"
        fil={[{ libelle: "Clients", href: "/ventes/clients" }]}
        sousTitre="Votre liste de clients est dans Excel ? Copiez-la, collez-la ici : tous les clients sont créés d'un coup, avec leur code."
      />
      <Carte>
        <ImportCollage colonnes={colonnes} existants={existants} doublonSur={DOUBLON_CLIENT} action={importerClients} nomModele="modele-clients" quoi={["client", "clients"]} />
      </Carte>
    </>
  );
}
