import type { Metadata } from "next";
import Link from "next/link";
import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireTournee } from "./formulaire";

export const metadata: Metadata = { title: "Nouvelle tournée" };

export default async function NouvelleTournee() {
  const supabase = await clientServeur();
  const [{ data: vehicules }, { data: chauffeurs }] = await Promise.all([
    supabase.from("vehicules").select("id, immatriculation, libelle, capacite_colis").eq("actif", true).order("immatriculation"),
    supabase.from("chauffeurs").select("id, nom").eq("actif", true).order("nom"),
  ]);
  return (
    <>
      <TitrePage titre="Nouvelle tournée" />
      <Carte>
        {(vehicules ?? []).length === 0 || (chauffeurs ?? []).length === 0 ? (
          <p>
            Enregistrez d&apos;abord au moins un véhicule et un chauffeur dans{" "}
            <Link href="/logistique/listes" className="font-semibold text-papel-700 underline">les listes de référence</Link>.
          </p>
        ) : (
          <FormulaireTournee
            dateDuJour={aujourdhui()}
            vehicules={(vehicules ?? []).map((v) => ({ id: v.id, libelle: `${v.immatriculation}${v.libelle ? ` – ${v.libelle}` : ""}${v.capacite_colis ? ` (${v.capacite_colis} colis)` : ""}` }))}
            chauffeurs={chauffeurs ?? []}
          />
        )}
      </Carte>
    </>
  );
}
