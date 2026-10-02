import Link from "next/link";
import { Carte, TitrePage } from "@/components/ui";
import { optionsClient } from "@/lib/ventes/options";
import { FormulaireClient } from "../formulaire";

export default async function NouveauClient() {
  const options = await optionsClient();
  return (
    <>
      <Link href="/ventes/clients" className="text-papel-700 underline">
        ← Clients
      </Link>
      <TitrePage titre="Nouveau client" />
      <Carte>
        <FormulaireClient id={null} {...options} />
      </Carte>
    </>
  );
}
