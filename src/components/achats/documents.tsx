import { Carte, Cellule, Tableau } from "@/components/ui";
import { formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { EnvoiDocument, LienTelechargement } from "./envoi-document";

/** Liste des documents joints (facture, BL, packing list…) et envoi d'un nouveau document. */
export async function DocumentsJoints({ objetType, objetId }: { objetType: "bon_commande" | "conteneur"; objetId: string }) {
  const supabase = await clientServeur();
  const [{ data: docs }, { data: types }] = await Promise.all([
    supabase.from("documents").select("id, nom_fichier, chemin, taille_octets, created_at, types_documents(libelle)").eq("objet_type", objetType).eq("objet_id", objetId).order("created_at"),
    supabase.from("types_documents").select("id, libelle").eq("actif", true).order("ordre"),
  ]);
  return (
    <Carte titre={`Documents joints (${docs?.length ?? 0})`}>
      {docs && docs.length > 0 && (
        <Tableau entetes={["Document", "Type", "Taille", "Ajouté le"]}>
          {docs.map((d) => (
            <tr key={d.id}>
              <Cellule>
                <LienTelechargement chemin={d.chemin} nom={d.nom_fichier} />
              </Cellule>
              <Cellule>{d.types_documents?.libelle ?? "—"}</Cellule>
              <Cellule>{d.taille_octets ? `${Math.round(d.taille_octets / 1024)} Ko` : "—"}</Cellule>
              <Cellule>{formaterDate(d.created_at)}</Cellule>
            </tr>
          ))}
        </Tableau>
      )}
      <div className="mt-3">
        <EnvoiDocument objetType={objetType} objetId={objetId} types={types ?? []} />
      </div>
    </Carte>
  );
}
