import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { BoutonChargesMois } from "./bouton-charges";

export const metadata: Metadata = { title: "Fournisseurs et charges" };

const TRANCHES = [
  { libelle: "Non échu", min: 0, max: 0 },
  { libelle: "1 à 30 j", min: 1, max: 30 },
  { libelle: "31 à 60 j", min: 31, max: 60 },
  { libelle: "Plus de 60 j", min: 61, max: Infinity },
];

export default async function PageFournisseurs({ searchParams }: PageProps<"/finance/fournisseurs">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const etat = lireParam(sp, "etat") ?? "a_payer";
  const categorie = lireParam(sp, "categorie");
  const supabase = await clientServeur();
  let requete = supabase.from("factures_fournisseurs_etat").select("*").order("date_echeance").limit(500);
  if (q) requete = requete.or(`numero.ilike.${motifRecherche(q)},libelle.ilike.${motifRecherche(q)},beneficiaire.ilike.${motifRecherche(q)}`);
  if (etat === "a_payer") requete = requete.gt("solde_gnf", 0);
  if (etat === "en_retard") requete = requete.gt("solde_gnf", 0).gt("jours_retard", 0);
  if (etat === "soldee") requete = requete.eq("solde_gnf", 0).neq("statut", "annulee");
  if (categorie) requete = requete.eq("categorie_id", categorie);
  const [{ data }, { data: categories }, { data: dettes }] = await Promise.all([
    requete,
    supabase.from("categories_charges").select("id, libelle").order("ordre"),
    supabase.from("factures_fournisseurs_etat").select("solde_gnf, jours_retard").gt("solde_gnf", 0).limit(20000),
  ]);
  const lignes = data ?? [];
  // Jours de retard = 0 tant que l'échéance n'est pas dépassée.
  const tranche = (t: (typeof TRANCHES)[number]) =>
    (dettes ?? []).filter((d) => Number(d.jours_retard) >= t.min && Number(d.jours_retard) <= t.max).reduce((s, d) => s + Number(d.solde_gnf), 0);
  return (
    <>
      <TitrePage titre="Fournisseurs et charges" sousTitre="Factures à payer, règlements et charges fixes mensuelles." action={<Link href="/finance/fournisseurs/nouvelle" className="inline-flex min-h-11 items-center rounded-lg bg-papel-700 px-4 font-semibold text-white">Nouvelle facture</Link>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRANCHES.map((t) => (
          <Indicateur key={t.libelle} libelle={`Dettes – ${t.libelle}`} valeur={gnf(tranche(t))} ton={t.min > 30 && tranche(t) > 0 ? "alerte" : "normal"} />
        ))}
      </div>
      <Carte className="mb-4">
        <BoutonChargesMois />
      </Carte>
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="N°, libellé ou bénéficiaire"
          valeurs={{ etat: lireParam(sp, "etat"), categorie }}
          filtres={[
            { nom: "etat", libelle: "État (par défaut : à payer)", options: [{ valeur: "en_retard", libelle: "En retard" }, { valeur: "soldee", libelle: "Soldées" }, { valeur: "toutes", libelle: "Toutes" }] },
            { nom: "categorie", libelle: "Catégorie", options: (categories ?? []).map((c) => ({ valeur: c.id, libelle: c.libelle })) },
          ]}
          action={
            <ExportCsv
              nomFichier="factures-fournisseurs"
              entetes={["N°", "Réf. fournisseur", "Bénéficiaire", "Libellé", "Catégorie", "Compte", "Date", "Échéance", "Devise", "HT (devise)", "TVA (devise)", "Taux", "Total GNF", "Payé GNF", "Reste GNF", "Retard (j)"]}
              lignes={lignes.map((f) => [f.numero, f.reference_fournisseur, f.beneficiaire, f.libelle, f.categorie_libelle, f.compte_charge, f.date_facture, f.date_echeance, f.devise, f.devise === "USD" ? Number(f.montant_ht) / 100 : Number(f.montant_ht), f.devise === "USD" ? Number(f.montant_tva) / 100 : Number(f.montant_tva), Number(f.taux_change), Number(f.total_gnf), Number(f.paye_gnf), Number(f.solde_gnf), Number(f.jours_retard)])}
            />
          }
        />
        <Tableau entetes={["N°", "Bénéficiaire", "Libellé", "Échéance", "Total", "Reste dû", ""]}>
          {lignes.map((f) => (
            <tr key={f.id}>
              <Cellule><Link href={`/finance/fournisseurs/${f.id}`} className="font-mono font-semibold text-papel-800 underline">{f.numero}</Link></Cellule>
              <Cellule>{f.beneficiaire}</Cellule>
              <Cellule className="text-sm">{f.libelle}<span className="block text-gray-600">{f.categorie_libelle}</span></Cellule>
              <Cellule className={Number(f.solde_gnf) > 0 && Number(f.jours_retard) > 0 ? "font-semibold text-red-700" : ""}>{formaterDate(f.date_echeance)}</Cellule>
              <Cellule>{gnf(f.total_gnf)}</Cellule>
              <Cellule className="font-semibold">{gnf(f.solde_gnf)}</Cellule>
              <Cellule>{f.statut === "annulee" ? <Badge ton="neutre">Annulée</Badge> : Number(f.solde_gnf) === 0 ? <Badge ton="succes">Soldée</Badge> : Number(f.jours_retard) > 0 ? <Badge ton="erreur">{f.jours_retard} j de retard</Badge> : null}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
