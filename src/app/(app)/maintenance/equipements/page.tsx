import type { Metadata } from "next";
import Link from "next/link";
import { Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Équipements" };

export default async function PageEquipements() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("equipements").select("id, code, libelle, categorie, criticite, marque_modele, date_mise_service, lignes_production(libelle)").eq("actif", true).order("code");
  return (
    <>
      <TitrePage titre="Équipements" sousTitre="Fiche, historique, pièces de rechange et fiabilité de chaque machine." action={<Link href="/maintenance/listes/equipements" className="font-semibold text-papel-700 underline">Ajouter ou modifier</Link>} />
      <Carte>
        <Tableau entetes={["Code", "Équipement", "Ligne", "Catégorie", "Criticité", "Mise en service"]}>
          {(data ?? []).map((e) => (
            <tr key={e.id}>
              <Cellule><Link href={`/maintenance/equipements/${e.id}`} className="font-mono font-semibold text-papel-700 hover:underline">{e.code}</Link></Cellule>
              <Cellule>{e.libelle}{e.marque_modele && <span className="block text-sm text-gray-600">{e.marque_modele}</span>}</Cellule>
              <Cellule>{e.lignes_production?.libelle ?? "—"}</Cellule>
              <Cellule>{e.categorie || "—"}</Cellule>
              <Cellule>{e.criticite}</Cellule>
              <Cellule>{formaterDate(e.date_mise_service)}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
