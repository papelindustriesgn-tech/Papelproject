import type { Metadata } from "next";
import { Carte, TitrePage } from "@/components/ui";
import { clientServeur } from "@/lib/supabase/serveur";
import { LigneParametre, type Parametre } from "@/components/reglages/ligne-parametre";

export const metadata: Metadata = { title: "Paramètres" };

const CATEGORIES: Record<string, string> = {
  entreprise: "Entreprise (devis et factures)",
  production: "Production",
  stock: "Stock",
  ventes: "Ventes et dotation",
  terrain: "Application terrain et alertes commerciales",
  logistique: "Logistique",
  qualite: "Qualité",
  maintenance: "Maintenance",
  comptabilite: "Comptabilité",
  direction: "Rapport hebdomadaire",
  devises: "Devises",
};

export default async function PageParametres() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, libelle, description, type_valeur, unite, valeur, categorie").order("cle");
  const parCategorie = new Map<string, Parametre[]>();
  for (const p of data ?? []) parCategorie.set(p.categorie, [...(parCategorie.get(p.categorie) ?? []), p]);

  return (
    <>
      <TitrePage titre="Paramètres" sousTitre="Tous les paramètres. Chaque service peut aussi régler les siens dans « Réglages du service ». Chaque modification est enregistrée dans le journal d'audit." />
      <div className="flex flex-col gap-4">
        {/* Toutes les catégories, y compris celles qui n'ont pas encore de libellé ci-dessus. */}
        {[...Object.entries(CATEGORIES), ...[...parCategorie.keys()].filter((c) => !CATEGORIES[c]).map((c) => [c, c] as [string, string])]
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
