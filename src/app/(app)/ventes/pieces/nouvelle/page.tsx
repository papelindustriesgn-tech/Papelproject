import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireNouvellePiece } from "./formulaire";

export default async function NouvellePiece({ searchParams }: PageProps<"/ventes/pieces/nouvelle">) {
  const sp = await searchParams;
  const supabase = await clientServeur();
  const { data: clients } = await supabase.from("clients").select("id, nom, code").eq("actif", true).order("nom");
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Pièces", href: "/ventes/pieces" }]} titre="Nouvelle pièce de vente" sousTitre="Les prix sont repris automatiquement de la grille en vigueur pour le type du client." />
      <Carte>
        <FormulaireNouvellePiece
          clients={(clients ?? []).map((c) => ({ id: c.id, libelle: `${c.nom} (${c.code})` }))}
          type={typeof sp.type === "string" ? sp.type : "commande"}
          client={typeof sp.client === "string" ? sp.client : undefined}
          dateDuJour={aujourdhui()}
        />
      </Carte>
    </>
  );
}
