import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireBc } from "./formulaire";

export default async function NouveauBc() {
  const supabase = await clientServeur();
  const [{ data: fournisseurs }, { data: demandes }] = await Promise.all([
    supabase.from("fournisseurs").select("id, nom, devise").eq("actif", true).order("nom"),
    supabase.from("demandes_achat").select("id, numero, quantite, articles(libelle, unite)").eq("statut", "approuvee").is("bc_id", null),
  ]);
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Bons de commande", href: "/achats/commandes" }]} titre="Nouveau bon de commande" />
      <Carte>
        <FormulaireBc
          dateDuJour={aujourdhui()}
          fournisseurs={fournisseurs ?? []}
          demandes={(demandes ?? []).map((d) => ({ id: d.id, libelle: `${d.numero} – ${d.articles?.libelle} : ${nombre(d.quantite, 3)} ${d.articles?.unite}` }))}
        />
      </Carte>
    </>
  );
}
