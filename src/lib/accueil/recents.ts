import "server-only";
import { cache } from "react";
import { TYPES_MOUVEMENT, afficherStock, gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

/**
 * « Ce qui vient de se passer » : les derniers faits enregistrés qui concernent un service (mouvements de stock,
 * paiements, factures, livraisons, saisies de production), du plus récent au plus ancien, chacun avec son lien.
 * Lu avec les droits de l'utilisateur (la RLS masque ce qu'il ne voit pas).
 */
export interface Evenement {
  quand: string;
  texte: string;
  lien: string;
}

export interface Recents {
  evenements: Evenement[];
  /** Une des lectures a échoué : on le dit, on n'affiche pas « rien ne s'est passé ». */
  incomplet: boolean;
}

type Client = Awaited<ReturnType<typeof clientServeur>>;
type Source = (s: Client) => Promise<Evenement[]>;

const NOMS_PIECES: Record<string, string> = { devis: "Devis enregistré", commande: "Commande enregistrée", facture: "Facture enregistrée", avoir: "Avoir (annulation) enregistré" };

/** Lecture qui lève en cas d'échec (comptée comme « incomplet »). */
function ou<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

const mouvements: Source = async (s) => {
  const lignes = ou(
    await s
      .from("mouvements_stock")
      .select("id, type, quantite, created_at, articles(libelle, unite, conditionnements(paquets_par_colis))")
      .order("created_at", { ascending: false })
      .limit(6),
  );
  return lignes.map((m) => {
    const a = m.articles;
    const q = Number(m.quantite);
    const qte = a ? afficherStock(Math.abs(q), a.unite, a.conditionnements?.paquets_par_colis) : nombre(Math.abs(q));
    return {
      quand: m.created_at,
      texte: `${TYPES_MOUVEMENT[m.type]?.libelle ?? m.type} : ${q < 0 ? "−" : "+"}${qte} · ${a?.libelle ?? "article"}`,
      lien: "/magasin/mouvements",
    };
  });
};

const paiements: Source = async (s) => {
  const lignes = ou(
    await s
      .from("paiements")
      .select("id, montant_gnf, created_at, pieces_vente(id, numero, clients(nom))")
      .order("created_at", { ascending: false })
      .limit(5),
  );
  return lignes.map((p) => ({
    quand: p.created_at,
    texte: `Argent reçu : ${gnf(p.montant_gnf)} de ${p.pieces_vente?.clients?.nom ?? "client"} (${p.pieces_vente?.numero ?? "facture"})`,
    lien: p.pieces_vente ? `/ventes/pieces/${p.pieces_vente.id}` : "/ventes/encaissements",
  }));
};

const pieces: Source = async (s) => {
  const lignes = ou(
    await s
      .from("pieces_vente")
      .select("id, type_piece, numero, total_ttc_gnf, valide_le, clients(nom)")
      .eq("statut", "valide")
      .not("valide_le", "is", null)
      .order("valide_le", { ascending: false })
      .limit(5),
  );
  return lignes.map((p) => ({
    quand: p.valide_le!,
    texte: `${NOMS_PIECES[p.type_piece] ?? "Document enregistré"} : ${p.numero} · ${p.clients?.nom ?? ""} · ${gnf(p.total_ttc_gnf)}`,
    lien: `/ventes/pieces/${p.id}`,
  }));
};

const livraisons: Source = async (s) => {
  const lignes = ou(
    await s
      .from("livraisons")
      .select("id, numero, statut_remise, valide_le, remise_le, pieces_vente(clients(nom))")
      .eq("statut", "validee")
      .order("valide_le", { ascending: false })
      .limit(5),
  );
  const REMISE: Record<string, string> = { livree: "remis au client", partielle: "remis en partie", refusee: "refusé par le client" };
  return lignes.map((l) => {
    const remis = l.statut_remise && l.statut_remise !== "a_livrer" && l.remise_le;
    return {
      quand: (remis ? l.remise_le : l.valide_le) ?? l.valide_le!,
      texte: `Bon de livraison ${l.numero} ${remis ? REMISE[l.statut_remise!] ?? "remis" : "prêt : colis sortis du stock"} · ${l.pieces_vente?.clients?.nom ?? ""}`,
      lien: `/ventes/livraisons/${l.id}`,
    };
  });
};

const productions: Source = async (s) => {
  const lignes = ou(
    await s
      .from("fiches_production")
      .select("id, date_production, statut, code_lot, created_at, validee_le, lignes_production(libelle)")
      .order("created_at", { ascending: false })
      .limit(5),
  );
  return lignes.map((f) => ({
    quand: f.validee_le ?? f.created_at,
    texte: `Saisie de production du ${f.date_production.split("-").reverse().join("/")} ${f.statut === "validee" ? `validée (lot ${f.code_lot ?? "—"})` : "à terminer"}${f.lignes_production?.libelle ? ` · ${f.lignes_production.libelle}` : ""}`,
    lien: `/production/fiches/${f.id}`,
  }));
};

const depenses: Source = async (s) => {
  const lignes = ou(
    await s.from("factures_fournisseurs").select("id, numero, libelle, tiers, total_gnf, created_at, fournisseurs(nom)").order("created_at", { ascending: false }).limit(4),
  );
  return lignes.map((f) => ({
    quand: f.created_at,
    texte: `Dépense ${f.numero ?? ""} enregistrée : ${f.libelle} · ${f.fournisseurs?.nom ?? f.tiers ?? ""} · ${gnf(f.total_gnf)}`,
    lien: `/finance/fournisseurs/${f.id}`,
  }));
};

/** Sources montrées par service. */
const SOURCES: Record<string, Source[]> = {
  magasin: [mouvements, livraisons],
  production: [productions, mouvements],
  ventes: [pieces, livraisons, paiements],
  finance: [paiements, depenses, pieces],
  logistique: [livraisons],
  direction: [pieces, paiements, livraisons, productions],
};

export const chargerRecents = cache(async (espace: string, nombreMax = 6): Promise<Recents | null> => {
  const sources = SOURCES[espace];
  if (!sources) return null;
  const s = await clientServeur();
  const resultats = await Promise.allSettled(sources.map((f) => f(s)));
  const evenements = resultats
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => b.quand.localeCompare(a.quand))
    .slice(0, nombreMax);
  return { evenements, incomplet: resultats.some((r) => r.status === "rejected") };
});
