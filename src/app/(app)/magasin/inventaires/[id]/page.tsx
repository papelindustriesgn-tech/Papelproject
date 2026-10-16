import { notFound } from "next/navigation";
import { BarreEtapes, Carte, TitrePage } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FeuilleComptage } from "../formulaires";

export default async function PageInventaire({ params }: PageProps<"/magasin/inventaires/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: inv } = await supabase
    .from("inventaires")
    .select("id, libelle, date_inventaire, statut, inventaire_lignes(id, quantite_theorique, quantite_comptee, articles(code, libelle, unite), lots(numero_lot))")
    .eq("id", id)
    .maybeSingle();
  if (!inv) notFound();
  const lignes = inv.inventaire_lignes
    .map((l) => ({
      id: l.id,
      libelle: `${l.articles?.code} – ${l.articles?.libelle}`,
      lot: l.lots?.numero_lot ?? null,
      unite: l.articles?.unite ?? "",
      theorique: Number(l.quantite_theorique),
      comptee: l.quantite_comptee === null ? null : Number(l.quantite_comptee),
    }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle) || (a.lot ?? "").localeCompare(b.lot ?? ""));

  return (
    <>
      <TitrePage
        fil={[{ libelle: "Inventaires", href: "/magasin/inventaires" }]}
        titre={inv.libelle}
        sousTitre={`Ouvert le ${formaterDate(inv.date_inventaire)} · ${lignes.length} ligne(s)`}
        action={<BarreEtapes etapes={[{ code: "en_cours", libelle: "Comptage en cours" }, { code: "valide", libelle: "Validé" }]} courante={inv.statut === "valide" ? "valide" : "en_cours"} />}
      />
      <Carte>
        <FeuilleComptage inventaireId={inv.id} lignes={lignes} modifiable={inv.statut === "en_cours"} />
      </Carte>
    </>
  );
}
