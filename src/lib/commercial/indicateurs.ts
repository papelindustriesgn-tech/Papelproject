import "server-only";
import { clientServeur } from "@/lib/supabase/serveur";

export interface IndicateursCommerciaux {
  visites: number;
  visitesParJour: number;
  horsZone: number;
  ruptures: number;
  tauxRupture: number | null;
  nouveauxPva: number;
  pvaActifs: number;
  quartiersCouverts: number;
  quartiersTotal: number;
  communesCouvertes: number;
  parCommercial: {
    id: string;
    nom: string;
    visites: number;
    horsZone: number;
    ruptures: number;
    nouveauxPva: number;
    pieces: number;
    caHtGnf: number;
    objectifs: { visites: number; nouveaux_pva: number; ca_ht_gnf: number; colis: number } | null;
  }[];
}

/** Indicateurs de l'équipe commerciale sur une période (le responsable voit tout grâce à la RLS). */
export async function chargerIndicateursCommerciaux(du: string, au: string, nbJours: number): Promise<IndicateursCommerciaux> {
  const supabase = await clientServeur();
  const debut = `${du}T00:00:00Z`;
  const fin = `${au}T23:59:59Z`;
  const [{ data: visites }, { data: pva }, { count: quartiersTotal }, { data: commerciaux }, { data: pieces }, { data: objectifs }] = await Promise.all([
    supabase.from("visites").select("commercial_id, dans_zone, rupture").gte("checkin_at", debut).lte("checkin_at", fin).limit(20000),
    supabase.from("pva_carte").select("id, commercial_id, quartier_id, commune_nom, created_at, actif").limit(20000),
    supabase.from("quartiers").select("id", { count: "exact", head: true }),
    supabase.from("utilisateur_roles").select("profils(id, nom, prenom)").eq("role", "commercial_terrain"),
    supabase.from("pieces_vente").select("commercial_id, type_piece, total_ht_gnf").eq("statut", "valide").in("type_piece", ["facture", "commande", "avoir"]).gte("date_piece", du).lte("date_piece", au).limit(20000),
    supabase.from("objectifs_commerciaux").select("commercial_id, visites, nouveaux_pva, ca_ht_gnf, colis").eq("mois", `${au.slice(0, 7)}-01`),
  ]);
  const v = visites ?? [];
  const p = (pva ?? []).filter((x) => x.actif);
  const nouveaux = p.filter((x) => x.created_at! >= debut && x.created_at! <= fin);
  return {
    visites: v.length,
    visitesParJour: nbJours > 0 ? v.length / nbJours : 0,
    horsZone: v.filter((x) => x.dans_zone === false).length,
    ruptures: v.filter((x) => x.rupture).length,
    tauxRupture: v.length ? v.filter((x) => x.rupture).length / v.length : null,
    nouveauxPva: nouveaux.length,
    pvaActifs: p.length,
    quartiersCouverts: new Set(p.map((x) => x.quartier_id).filter(Boolean)).size,
    quartiersTotal: quartiersTotal ?? 0,
    communesCouvertes: new Set(p.map((x) => x.commune_nom).filter(Boolean)).size,
    parCommercial: (commerciaux ?? [])
      .filter((c) => c.profils)
      .map((c) => {
        const id = c.profils!.id;
        const vs = v.filter((x) => x.commercial_id === id);
        const ps = (pieces ?? []).filter((x) => x.commercial_id === id);
        return {
          id,
          nom: `${c.profils!.prenom} ${c.profils!.nom}`,
          visites: vs.length,
          horsZone: vs.filter((x) => x.dans_zone === false).length,
          ruptures: vs.filter((x) => x.rupture).length,
          nouveauxPva: nouveaux.filter((x) => x.commercial_id === id).length,
          pieces: ps.filter((x) => x.type_piece !== "avoir").length,
          caHtGnf: ps.filter((x) => x.type_piece !== "commande").reduce((s, x) => s + (x.type_piece === "avoir" ? -1 : 1) * x.total_ht_gnf, 0),
          objectifs: (objectifs ?? []).find((o) => o.commercial_id === id) ?? null,
        };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom)),
  };
}
