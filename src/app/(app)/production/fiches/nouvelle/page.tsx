import { Carte, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireNouvelleFiche } from "./formulaire";

export default async function NouvelleFiche() {
  const supabase = await clientServeur();
  const [{ data: postes }, { data: lignes }, { data: equipes }, { data: ordres }] = await Promise.all([
    supabase.from("postes").select("id, libelle, heure_debut, heure_fin").eq("actif", true).order("ordre"),
    supabase.from("lignes_production").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("equipes").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("of_avancement").select("id, numero, produit_libelle, conditionnement_libelle").in("statut", ["planifie", "en_cours"]).order("numero"),
  ]);
  // Poste en cours d'après l'heure de Conakry (= UTC), un poste pouvant passer minuit : choisi d'office.
  const maintenant = new Date().toISOString().slice(11, 16);
  const posteActuel = (postes ?? []).find((p) => {
    const debut = p.heure_debut.slice(0, 5);
    const fin = p.heure_fin.slice(0, 5);
    return debut <= fin ? maintenant >= debut && maintenant < fin : maintenant >= debut || maintenant < fin;
  });
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Saisies de production", href: "/production/fiches" }]} titre="Nouvelle saisie de production"
        sousTitre="Une saisie par poste et par ligne. Vérifiez les choix proposés, puis commencez."
      />
      <Carte>
        <FormulaireNouvelleFiche
          dateDuJour={aujourdhui()}
          posteParDefaut={posteActuel?.id}
          postes={(postes ?? []).map((p) => ({ id: p.id, libelle: `${p.libelle} (${p.heure_debut.slice(0, 5)} – ${p.heure_fin.slice(0, 5)})` }))}
          lignes={lignes ?? []}
          equipes={equipes ?? []}
          ordres={(ordres ?? []).map((o) => ({ id: o.id!, libelle: `${o.numero} – ${o.produit_libelle} (${o.conditionnement_libelle})` }))}
        />
      </Carte>
    </>
  );
}
