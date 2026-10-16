import type { Metadata } from "next";
import { FormulaireDemande } from "@/components/achats/formulaire-demande";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { STATUTS_DEMANDE } from "@/lib/achats/libelles";
import { formaterDate } from "@/lib/formulaires/dates";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireTraitement } from "./formulaire-traitement";

export const metadata: Metadata = { title: "Demandes d'achat" };

export default async function PageDemandes() {
  const supabase = await clientServeur();
  const [{ data }, { data: articles }] = await Promise.all([
    supabase.from("demandes_achat").select("*, articles(libelle, unite), profils!demandes_achat_demandeur_id_fkey(prenom, nom), bons_commande(numero)").order("created_at", { ascending: false }).limit(200),
    supabase.from("articles").select("id, libelle, unite").eq("actif", true).neq("famille", "produit_fini").order("libelle"),
  ]);
  return (
    <>
      <TitrePage titre="Demandes d'achat" sousTitre="Émises par le magasin, la production ou la maintenance ; approuvées puis regroupées dans un bon de commande." />
      <Carte titre="Demandes" className="mb-4">
        <Tableau entetes={["Numéro", "Article", "Quantité", "Besoin", "Demandeur", "Motif", "Statut", ""]}>
          {(data ?? []).map((d) => (
            <tr key={d.id}>
              <Cellule className="font-mono">{d.numero}</Cellule>
              <Cellule>{d.articles?.libelle}</Cellule>
              <Cellule>
                {nombre(d.quantite, 3)} {d.articles?.unite}
              </Cellule>
              <Cellule>{formaterDate(d.date_besoin)}</Cellule>
              <Cellule>{d.profils ? `${d.profils.prenom} ${d.profils.nom}` : "—"}</Cellule>
              <Cellule className="text-sm">{d.motif}</Cellule>
              <Cellule>
                <Badge ton={STATUTS_DEMANDE[d.statut].ton}>{STATUTS_DEMANDE[d.statut].libelle}</Badge>
                {d.bons_commande?.numero && <span className="block text-sm">{d.bons_commande.numero}</span>}
              </Cellule>
              <Cellule>{d.statut === "soumise" && <FormulaireTraitement id={d.id} />}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
      <Carte titre="Nouvelle demande">
        <FormulaireDemande espace="achats" articles={articles ?? []} />
      </Carte>
    </>
  );
}
