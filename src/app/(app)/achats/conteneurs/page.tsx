import type { Metadata } from "next";
import Link from "next/link";
import { EtapesConteneur } from "@/components/achats/etapes";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Carte, TitrePage } from "@/components/ui";
import { LIBELLES_STATUT_CONTENEUR } from "@/lib/achats/libelles";
import { aujourdhui } from "@/lib/formulaires/dates";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Conteneurs" };

export default async function PageConteneurs() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("conteneurs").select("*, bons_commande(numero, fournisseurs(nom))").order("created_at", { ascending: false }).limit(200);
  const jour = aujourdhui();
  return (
    <>
      <TitrePage titre="Conteneurs" sousTitre="Suivi de la commande à la livraison à l'usine de Coyah." />
      <Carte>
        <div className="mb-3">
          <ExportCsv
            nomFichier="conteneurs"
            entetes={["Référence", "Bon de commande", "Fournisseur", "Navire", "Poids déclaré (kg)", "Statut", "Embarquement", "Arrivée port", "Dédouanement", "Livraison prévue", "Livraison réelle"]}
            lignes={(data ?? []).map((c) => [c.reference, c.bons_commande?.numero ?? "", c.bons_commande?.fournisseurs?.nom ?? "", c.navire, Number(c.poids_net_prevu_kg), LIBELLES_STATUT_CONTENEUR[c.statut], c.date_embarquement_reelle ?? "", c.date_arrivee_port_reelle ?? "", c.date_dedouanement_reelle ?? "", c.date_livraison_prevue ?? "", c.date_livraison_reelle ?? ""])}
          />
        </div>
        <ul className="divide-y divide-gray-100">
          {(data ?? []).map((c) => (
            <li key={c.id} className="py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Link href={`/achats/conteneurs/${c.id}`} className="font-mono font-semibold text-papel-800 underline">{c.reference}</Link>
                <span className="text-sm text-gray-700">{c.bons_commande?.numero} · {c.bons_commande?.fournisseurs?.nom} · {formaterPoids(kg(Number(c.poids_net_prevu_kg)))}</span>
              </div>
              <EtapesConteneur conteneur={c} aujourdhui={jour} />
            </li>
          ))}
        </ul>
      </Carte>
    </>
  );
}
