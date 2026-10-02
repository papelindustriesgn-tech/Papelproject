import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { LIBELLES_FAMILLES } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireOuverture } from "./formulaires";

export const metadata: Metadata = { title: "Inventaires" };

export default async function PageInventaires() {
  const supabase = await clientServeur();
  const { data } = await supabase.from("inventaires").select("id, libelle, date_inventaire, famille, statut, inventaire_lignes(count)").order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <TitrePage titre="Inventaires" sousTitre="Comptage physique : le stock théorique est photographié à l'ouverture, les écarts sont passés en stock à la validation." />
      <Carte titre="Nouvel inventaire" className="mb-4">
        <FormulaireOuverture />
      </Carte>
      <Carte titre="Historique">
        <Tableau entetes={["Date", "Inventaire", "Périmètre", "Lignes", "Statut"]}>
          {(data ?? []).map((i) => (
            <tr key={i.id}>
              <Cellule>{formaterDate(i.date_inventaire)}</Cellule>
              <Cellule>
                <Link href={`/magasin/inventaires/${i.id}`} className="font-semibold text-papel-800 underline">
                  {i.libelle}
                </Link>
              </Cellule>
              <Cellule>{i.famille ? LIBELLES_FAMILLES[i.famille] : "Tout le stock"}</Cellule>
              <Cellule>{i.inventaire_lignes[0]?.count ?? 0}</Cellule>
              <Cellule>{i.statut === "valide" ? <Badge ton="succes">Validé</Badge> : i.statut === "annule" ? <Badge ton="neutre">Annulé</Badge> : <Badge ton="alerte">En cours</Badge>}</Cellule>
            </tr>
          ))}
        </Tableau>
        {!data?.length && <p className="py-4 text-gray-700">Aucun inventaire pour le moment.</p>}
      </Carte>
    </>
  );
}
