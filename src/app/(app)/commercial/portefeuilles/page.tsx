import type { Metadata } from "next";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";
import { Reattribution } from "./formulaire";

export const metadata: Metadata = { title: "Portefeuilles" };

/**
 * Portefeuilles des commerciaux : chaque point de vente a UN commercial (pas deux commerciaux chez le même client).
 * Le responsable voit la répartition et réattribue en un clic.
 */
export default async function PagePortefeuilles({ searchParams }: PageProps<"/commercial/portefeuilles">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const commercial = lireParam(sp, "commercial");
  const statut = lireParam(sp, "statut");
  const supabase = await clientServeur();
  let requete = supabase
    .from("pva_carte")
    .select("id, nom, type_libelle, quartier_nom, commune_nom, commercial_id, commercial_nom, client_id, derniere_visite")
    .eq("actif", true)
    .order("commercial_nom")
    .order("nom");
  if (q) requete = requete.or(`nom.ilike.${motifRecherche(q)},quartier_nom.ilike.${motifRecherche(q)}`);
  if (commercial) requete = requete.eq("commercial_id", commercial);
  if (statut === "prospect") requete = requete.is("client_id", null);
  if (statut === "client") requete = requete.not("client_id", "is", null);
  const [{ data: pva }, { data: roles }, { data: tous }] = await Promise.all([
    requete,
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom, actif)").eq("role", "commercial_terrain"),
    supabase.from("pva_carte").select("commercial_id, client_id, quartier_nom").eq("actif", true),
  ]);
  const commerciaux = (roles ?? []).filter((r) => r.profils?.actif).map((r) => ({ id: r.profils!.id, nom: `${r.profils!.prenom} ${r.profils!.nom}` })).sort((a, b) => a.nom.localeCompare(b.nom));
  const lignes = pva ?? [];

  // Quartiers couverts par plusieurs commerciaux : risque de se croiser sur le terrain.
  const parQuartier = new Map<string, Set<string>>();
  for (const p of tous ?? []) if (p.quartier_nom) parQuartier.set(p.quartier_nom, (parQuartier.get(p.quartier_nom) ?? new Set()).add(p.commercial_id!));
  const partages = [...parQuartier.entries()].filter(([, s]) => s.size > 1).map(([q]) => q).sort();

  return (
    <>
      <TitrePage titre="Portefeuilles des commerciaux" sousTitre="Un point de vente = un seul commercial. Réattribuez ici pour répartir le terrain." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {commerciaux.map((c) => {
          const siens = (tous ?? []).filter((p) => p.commercial_id === c.id);
          return <Indicateur key={c.id} libelle={c.nom} valeur={`${siens.length} PVA`} detail={`${siens.filter((p) => p.client_id).length} clients · ${siens.filter((p) => !p.client_id).length} prospects`} />;
        })}
      </div>
      {partages.length > 0 && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Quartiers partagés entre plusieurs commerciaux : <strong>{partages.join(", ")}</strong>. Pour éviter les croisements, regroupez chaque quartier sur un commercial.
        </p>
      )}
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Point de vente ou quartier"
          valeurs={{ commercial, statut }}
          filtres={[
            { nom: "commercial", libelle: "Commercial", options: commerciaux.map((c) => ({ valeur: c.id, libelle: c.nom })) },
            { nom: "statut", libelle: "Statut", options: [{ valeur: "prospect", libelle: "Prospects" }, { valeur: "client", libelle: "Clients" }] },
          ]}
        />
        <Tableau entetes={["Point de vente", "Statut", "Quartier", "Dernière visite", "Commercial"]}>
          {lignes.map((p) => (
            <tr key={p.id}>
              <Cellule className="font-medium">
                {p.nom}
                <span className="block text-sm text-gray-500">{p.type_libelle}</span>
              </Cellule>
              <Cellule>{p.client_id ? <Badge ton="succes">Client</Badge> : <Badge ton="neutre">Prospect</Badge>}</Cellule>
              <Cellule>{[p.quartier_nom, p.commune_nom].filter(Boolean).join(", ") || "—"}</Cellule>
              <Cellule>{p.derniere_visite ? formaterDate(p.derniere_visite) : "Jamais"}</Cellule>
              <Cellule>
                <Reattribution pvaId={p.id!} commercialId={p.commercial_id!} commerciaux={commerciaux} />
              </Cellule>
            </tr>
          ))}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-600">Aucun point de vente.</p>}
      </Carte>
    </>
  );
}
