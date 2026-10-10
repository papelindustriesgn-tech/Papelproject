"use client";

import { BarreOnglets } from "./communs";
import { FournisseurTerrain, useTerrain } from "./contexte";
import { VueAccueil } from "./vues/accueil";
import { VueDocument, VueDocuments, VueNouveauDocument } from "./vues/document";
import { VueFichePva } from "./vues/fiche-pva";
import { VueFormulairePva } from "./vues/formulaire-pva";
import { VueListePva } from "./vues/pva";
import { VueFicheClient } from "./vues/clients";
import { VueMoi } from "./vues/moi";
import { VueVisite } from "./vues/visite";

function Routeur() {
  const { route } = useTerrain();
  switch (route.vue) {
    case "pva":
      return route.id ? <VueFichePva id={route.id} visiteOk={route.params.get("visite") === "ok"} /> : <VueListePva />;
    case "pva-nouveau":
      return <VueFormulairePva />;
    case "pva-modifier":
      return <VueFormulairePva id={route.id} />;
    case "visite":
      return <VueVisite pvaId={route.id!} />;
    case "document-nouveau":
      return <VueNouveauDocument clientInitial={route.params.get("client") ?? undefined} />;
    case "document":
      return <VueDocument id={route.id!} nouveau={route.params.get("nouveau")} />;
    case "documents":
      return <VueDocuments />;
    case "moi":
      return <VueMoi />;
    case "client":
      return route.id ? <VueFicheClient id={route.id} /> : <VueListePva />;
    default:
      return <VueAccueil />;
  }
}

/** Application terrain (PWA) : plein écran, onglets en bas ; tout fonctionne depuis la base du téléphone, avec ou sans réseau. */
export function ApplicationTerrain({ utilisateurId }: { utilisateurId: string }) {
  return (
    <FournisseurTerrain utilisateurId={utilisateurId}>
      {/* Application plein écran : contenu, puis onglets fixés en bas (espace réservé). */}
      <div className="-mt-3 mx-auto max-w-xl pb-24">
        <Routeur />
      </div>
      <BarreOnglets />
    </FournisseurTerrain>
  );
}
