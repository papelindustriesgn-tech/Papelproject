import { Carte, TitrePage } from "@/components/ui";
import { optionsClient } from "@/lib/ventes/options";
import { FormulaireClient } from "../formulaire";

export default async function NouveauClient() {
  const options = await optionsClient();
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Clients", href: "/ventes/clients" }]} titre="Nouveau client" />
      <Carte>
        <FormulaireClient id={null} {...options} />
      </Carte>
    </>
  );
}
