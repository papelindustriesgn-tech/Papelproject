import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { STATUTS_DEMANDE } from "@/lib/achats/libelles";
import { formaterDate } from "@/lib/formulaires/dates";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireDemande } from "./formulaire-demande";

/** Demandes d'achat d'un service (magasin, production, maintenance) : nouvelle demande et suivi de ses demandes (RLS : le demandeur voit les siennes). */
export async function MesDemandes({ espace }: { espace: string }) {
  const supabase = await clientServeur();
  const [{ data }, { data: articles }] = await Promise.all([
    supabase.from("demandes_achat").select("id, numero, quantite, date_besoin, motif, statut, commentaire, created_at, articles(libelle, unite)").order("created_at", { ascending: false }).limit(100),
    supabase.from("articles").select("id, libelle, unite").eq("actif", true).neq("famille", "produit_fini").order("libelle"),
  ]);
  return (
    <>
      <TitrePage titre="Demandes d'achat" sousTitre="Signalez un besoin au service achats ; suivez ensuite son traitement." />
      <Carte titre="Nouvelle demande" className="mb-4">
        <FormulaireDemande espace={espace} articles={articles ?? []} />
      </Carte>
      <Carte titre="Mes demandes">
        <Tableau entetes={["Numéro", "Date", "Article", "Quantité", "Besoin", "Motif", "Statut"]}>
          {(data ?? []).map((d) => (
            <tr key={d.id}>
              <Cellule className="font-mono">{d.numero}</Cellule>
              <Cellule>{formaterDate(d.created_at)}</Cellule>
              <Cellule>{d.articles?.libelle}</Cellule>
              <Cellule>
                {nombre(d.quantite, 3)} {d.articles?.unite}
              </Cellule>
              <Cellule>{formaterDate(d.date_besoin)}</Cellule>
              <Cellule>{d.motif}</Cellule>
              <Cellule>
                <Badge ton={STATUTS_DEMANDE[d.statut].ton}>{STATUTS_DEMANDE[d.statut].libelle}</Badge>
                {d.commentaire && <span className="block text-sm text-gray-600">{d.commentaire}</span>}
              </Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
