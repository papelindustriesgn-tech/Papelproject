import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { formaterMontant } from "@/lib/metier/devises";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { annulerFacture } from "../../actions";
import { FormulaireReglement } from "./formulaire";

export default async function PageFactureFournisseur({ params }: PageProps<"/finance/fournisseurs/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: f }, { data: reglements }, { data: comptes }] = await Promise.all([
    supabase.from("factures_fournisseurs_etat").select("*").eq("id", id).maybeSingle(),
    supabase.from("reglements_fournisseurs").select("id, date_reglement, montant_gnf, reference, comptes_tresorerie(libelle)").eq("facture_id", id).order("date_reglement"),
    supabase.from("soldes_tresorerie").select("id, libelle, devise, solde").eq("actif", true).order("ordre"),
  ]);
  if (!f) notFound();
  const devise = f.devise as "GNF" | "USD";
  const reste = Number(f.solde_gnf);
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Fournisseurs et charges", href: "/finance/fournisseurs" }]}
        titre={`Facture ${f.numero}`}
        sousTitre={`${f.beneficiaire} · ${f.libelle}`}
        action={f.statut === "annulee" ? <Badge ton="neutre">Annulée</Badge> : reste === 0 ? <Badge ton="succes">Soldée</Badge> : Number(f.jours_retard) > 0 ? <Badge ton="erreur">{f.jours_retard} j de retard</Badge> : <Badge ton="alerte">À payer</Badge>}
      />
      <div className="flex flex-col gap-4">
        <Carte titre="Facture">
          <dl className="grid gap-2 sm:grid-cols-3">
            <div><dt className="text-sm text-gray-600">Catégorie</dt><dd>{f.categorie_libelle} (compte {f.compte_charge || "—"})</dd></div>
            <div><dt className="text-sm text-gray-600">Date / échéance</dt><dd>{formaterDate(f.date_facture)} → {formaterDate(f.date_echeance)}</dd></div>
            <div><dt className="text-sm text-gray-600">Réf. fournisseur</dt><dd>{f.reference_fournisseur || "—"}</dd></div>
            <div><dt className="text-sm text-gray-600">HT</dt><dd>{formaterMontant(Number(f.montant_ht), devise)}</dd></div>
            <div><dt className="text-sm text-gray-600">TVA</dt><dd>{formaterMontant(Number(f.montant_tva), devise)}</dd></div>
            <div><dt className="text-sm text-gray-600">Total</dt><dd className="font-semibold">{gnf(f.total_gnf)}{devise === "USD" && ` (taux ${nombre(f.taux_change, 2)})`}</dd></div>
            <div><dt className="text-sm text-gray-600">Payé</dt><dd>{gnf(f.paye_gnf)}</dd></div>
            <div><dt className="text-sm text-gray-600">Reste dû</dt><dd className="font-semibold">{gnf(reste)}</dd></div>
          </dl>
        </Carte>
        <Carte titre={`Règlements (${reglements?.length ?? 0})`}>
          <Tableau entetes={["Date", "Compte", "Montant", "Référence"]}>
            {(reglements ?? []).map((r) => (
              <tr key={r.id}>
                <Cellule>{formaterDate(r.date_reglement)}</Cellule>
                <Cellule>{r.comptes_tresorerie?.libelle}</Cellule>
                <Cellule>{gnf(r.montant_gnf)}</Cellule>
                <Cellule>{r.reference || "—"}</Cellule>
              </tr>
            ))}
          </Tableau>
          {reste > 0 && f.statut !== "annulee" && (
            <div className="mt-3">
              <FormulaireReglement factureId={id} reste={reste} dateDuJour={aujourdhui()} comptes={(comptes ?? []).map((c) => ({ id: c.id!, libelle: `${c.libelle} (solde ${formaterMontant(Number(c.solde), c.devise as "GNF" | "USD")})` }))} />
            </div>
          )}
        </Carte>
        {f.statut !== "annulee" && Number(f.paye_gnf) === 0 && (
          <form action={annulerFacture.bind(null, id)}>
            <button className="min-h-11 font-semibold text-red-700 underline">Annuler cette facture (saisie erronée)</button>
          </form>
        )}
      </div>
    </>
  );
}
