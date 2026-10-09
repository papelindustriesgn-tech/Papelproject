import "server-only";
import { ecrituresAchat, ecrituresTresorerie, ecrituresVente, type ComptesParametres, type Ecriture } from "@/lib/metier/comptabilite";
import { clientServeur } from "@/lib/supabase/serveur";

export const JOURNAUX = {
  ventes: { code: "VT", libelle: "Journal des ventes", description: "Factures et avoirs clients validés (clients / ventes / TVA collectée)." },
  achats: { code: "AC", libelle: "Journal des achats", description: "Factures fournisseurs (charges ou achats stockés / TVA déductible / fournisseurs)." },
  tresorerie: { code: "TR", libelle: "Journal de trésorerie", description: "Encaissements, règlements, virements et mouvements divers (classe 5)." },
} as const;
export type CodeJournal = keyof typeof JOURNAUX;

async function lireComptes(): Promise<ComptesParametres> {
  const supabase = await clientServeur();
  const { data } = await supabase.from("parametres").select("cle, valeur").like("cle", "compta_%");
  const v = (cle: string, defaut: string) => String(data?.find((p) => p.cle === cle)?.valeur ?? defaut);
  return {
    clients: v("compta_compte_clients", "4111"),
    ventes: v("compta_compte_ventes", "7021"),
    tvaCollectee: v("compta_compte_tva_collectee", "4431"),
    fournisseurs: v("compta_compte_fournisseurs", "4011"),
    tvaDeductible: v("compta_compte_tva_deductible", "4452"),
    virements: v("compta_compte_virements", "585"),
    attente: v("compta_compte_divers", "4711"),
  };
}

/** Écritures d'un journal sur une période (dates incluses). */
export async function chargerEcritures(journal: CodeJournal, du: string, au: string): Promise<Ecriture[]> {
  const supabase = await clientServeur();
  const c = await lireComptes();
  if (journal === "ventes") {
    const { data } = await supabase
      .from("pieces_vente")
      .select("type_piece, numero, date_piece, total_ht_gnf, total_tva_gnf, total_ttc_gnf, clients(code, nom)")
      .in("type_piece", ["facture", "avoir"])
      .eq("statut", "valide")
      .gte("date_piece", du)
      .lte("date_piece", au)
      .order("date_piece")
      .order("numero")
      .limit(20000);
    return (data ?? []).flatMap((p) =>
      ecrituresVente(
        { type: p.type_piece as "facture" | "avoir", numero: p.numero ?? "", date: p.date_piece, clientCode: p.clients?.code ?? "", clientNom: p.clients?.nom ?? "", htGnf: Number(p.total_ht_gnf), tvaGnf: Number(p.total_tva_gnf), ttcGnf: Number(p.total_ttc_gnf) },
        c,
      ),
    );
  }
  if (journal === "achats") {
    const { data } = await supabase
      .from("factures_fournisseurs_etat")
      .select("numero, date_facture, beneficiaire, libelle, compte_charge, montant_ht_gnf, montant_tva_gnf")
      .neq("statut", "annulee")
      .gte("date_facture", du)
      .lte("date_facture", au)
      .order("date_facture")
      .order("numero")
      .limit(20000);
    return (data ?? []).flatMap((f) =>
      ecrituresAchat({ numero: f.numero ?? "", date: f.date_facture!, tiers: f.beneficiaire ?? "", libelle: f.libelle!, compteCharge: f.compte_charge ?? "", htGnf: Number(f.montant_ht_gnf), tvaGnf: Number(f.montant_tva_gnf) }, c),
    );
  }
  const { data } = await supabase
    .from("mouvements_tresorerie")
    .select(
      "id, date_operation, sens, montant_gnf, origine, libelle, reference, comptes_tresorerie(compte_comptable), categories_charges(compte_comptable), paiements(pieces_vente(clients(code))), reglements_fournisseurs(factures_fournisseurs(tiers, fournisseurs(nom)))",
    )
    .gte("date_operation", du)
    .lte("date_operation", au)
    .order("date_operation")
    .order("created_at")
    .limit(50000);
  return (data ?? []).flatMap((m) =>
    ecrituresTresorerie(
      {
        id: m.id,
        date: m.date_operation,
        sens: m.sens as "entree" | "sortie",
        montantGnf: Number(m.montant_gnf),
        origine: m.origine as "client" | "fournisseur" | "virement" | "autre",
        compteTresorerie: m.comptes_tresorerie?.compte_comptable || c.attente,
        compteCharge: m.categories_charges?.compte_comptable ?? null,
        tiers: m.paiements?.pieces_vente?.clients?.code ?? m.reglements_fournisseurs?.factures_fournisseurs?.fournisseurs?.nom ?? m.reglements_fournisseurs?.factures_fournisseurs?.tiers ?? "",
        libelle: m.libelle,
        reference: m.reference,
      },
      c,
    ),
  );
}
