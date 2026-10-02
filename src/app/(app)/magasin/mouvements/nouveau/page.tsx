import Link from "next/link";
import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireMouvement } from "./formulaire";

export default async function NouveauMouvement({ searchParams }: PageProps<"/magasin/mouvements/nouveau">) {
  const sp = await searchParams;
  const supabase = await clientServeur();
  const [{ data: articles }, { data: lots }] = await Promise.all([
    supabase.from("etat_stock").select("article_id, code, libelle, unite, suivi_par_lot, quantite, paquets_par_colis").eq("actif", true).order("code"),
    supabase.from("etat_lots").select("id, article_id, numero_lot, poids_restant_kg").gt("poids_restant_kg", 0).neq("statut", "bloque").order("date_reception"),
  ]);
  return (
    <>
      <Link href="/magasin/mouvements" className="text-papel-700 underline">
        ← Mouvements
      </Link>
      <TitrePage titre="Nouveau mouvement" sousTitre="Pour réceptionner une bobine jumbo, utilisez l'écran Bobines (n° de lot, poids, grammage)." />
      <Carte>
        <FormulaireMouvement
          articleInitial={typeof sp.article === "string" ? sp.article : undefined}
          dateDuJour={aujourdhui()}
          articles={(articles ?? []).map((a) => ({ id: a.article_id!, code: a.code!, libelle: a.libelle!, unite: a.unite!, suivi_par_lot: !!a.suivi_par_lot, quantite: Number(a.quantite), paquets_par_colis: a.paquets_par_colis }))}
          lots={(lots ?? []).map((l) => ({ id: l.id!, article_id: l.article_id!, numero_lot: l.numero_lot!, poids_restant_kg: Number(l.poids_restant_kg) }))}
        />
      </Carte>
    </>
  );
}
