import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { clientServeur } from "@/lib/supabase/serveur";
import { LigneParametre, type Parametre } from "./ligne-parametre";

export const metadata: Metadata = { title: "Paramètres" };

const CATEGORIES: Record<string, string> = {
  entreprise: "Entreprise (devis et factures)",
  production: "Production",
  stock: "Stock",
  ventes: "Ventes et dotation",
  terrain: "Application terrain",
  devises: "Devises",
};

export default async function PageParametres() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, libelle, description, type_valeur, unite, valeur, categorie").order("cle");
  const parCategorie = new Map<string, Parametre[]>();
  for (const p of data ?? []) parCategorie.set(p.categorie, [...(parCategorie.get(p.categorie) ?? []), p]);

  return (
    <>
      <TitrePage titre="Paramètres" sousTitre="Chaque modification est enregistrée dans le journal d'audit." />
      <div className="flex flex-col gap-4">
        {Object.entries(CATEGORIES)
          .filter(([c]) => parCategorie.has(c))
          .map(([c, libelle]) => (
            <Carte key={c} titre={libelle}>
              {parCategorie.get(c)!.map((p) => (
                <LigneParametre key={p.cle} p={p} />
              ))}
            </Carte>
          ))}
      </div>
    </>
  );
}
