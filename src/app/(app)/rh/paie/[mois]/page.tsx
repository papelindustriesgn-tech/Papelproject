import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportCsv } from "@/components/donnees/export-csv";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { libelleMois, MODES_PAIEMENT_SALAIRE, nomComplet } from "@/lib/rh/libelles";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { BoutonValiderPaie, FormulairePreparerPaie, ModifBulletin } from "../../formulaires";

export const metadata: Metadata = { title: "Paie du mois" };

export default async function PaieDuMois({ params }: PageProps<"/rh/paie/[mois]">) {
  const { mois: m } = await params;
  if (!/^\d{4}-\d{2}$/.test(m)) notFound();
  const mois = `${m}-01`;
  const supabase = await clientServeur();
  const [{ data: periode }, { data }] = await Promise.all([
    supabase.from("periodes_paie").select("*").eq("mois", mois).maybeSingle(),
    supabase.from("bulletins").select("*, employes(id, matricule, nom, prenom, mode_paiement, compte_paiement, numero_cnss)").eq("mois", mois),
  ]);
  if (!periode) notFound();
  const lignes = (data ?? []).sort((a, b) => (a.employes?.nom ?? "").localeCompare(b.employes?.nom ?? ""));
  const somme = (f: (b: (typeof lignes)[number]) => number) => lignes.reduce((s, b) => s + f(b), 0);
  const brut = somme((b) => Number(b.brut_gnf));
  const net = somme((b) => Number(b.net_gnf));
  const cnssSal = somme((b) => Number(b.cnss_salarie_gnf));
  const cnssPat = somme((b) => Number(b.cnss_employeur_gnf));
  const rts = somme((b) => Number(b.rts_gnf));
  const valide = periode.statut === "validee";
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Paie", href: "/rh/paie" }]}
        titre={`Paie de ${libelleMois(mois)}`}
        sousTitre={`${lignes.length} bulletin(s)`}
        action={valide ? <Badge ton="succes">Validée — bulletins figés</Badge> : <BoutonValiderPaie mois={mois} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Indicateur libelle="Masse salariale brute" valeur={gnf(brut)} />
        <Indicateur libelle="Net à payer" valeur={gnf(net)} detail="À verser aux employés" />
        <Indicateur libelle="CNSS à déclarer" valeur={gnf(cnssSal + cnssPat)} detail={`Salariés ${gnf(cnssSal)} + employeur ${gnf(cnssPat)}`} />
        <Indicateur libelle="Impôt sur salaires (RTS)" valeur={gnf(rts)} detail="Retenu à la source" />
        <Indicateur libelle="Coût employeur" valeur={gnf(brut + cnssPat)} detail="Brut + CNSS patronale" />
      </div>
      {!valide && (
        <Carte titre="Recalculer" className="mb-4">
          <p className="mb-2 text-sm text-gray-600">Après une correction des présences, des absences ou d&apos;un salaire, recalculez : les primes et avances déjà saisies sont gardées.</p>
          <FormulairePreparerPaie moisDefaut={m} />
        </Carte>
      )}
      <Carte>
        <div className="mb-2 flex justify-end">
          <ExportCsv
            nomFichier={`paie-${m}`}
            entetes={["Matricule", "Employé", "N° CNSS", "Salaire de base", "Heures sup.", "Montant HS", "Jours d'absence non payée", "Retenue absences", "Primes", "Brut", "CNSS salarié", "CNSS employeur", "RTS", "Avances", "Net à payer", "Paiement", "Compte"]}
            lignes={lignes.map((b) => [b.employes?.matricule ?? "", b.employes ? nomComplet(b.employes) : "", b.employes?.numero_cnss ?? "", Number(b.salaire_base_gnf), Number(b.heures_sup), Number(b.montant_heures_sup_gnf), Number(b.jours_absence_non_payee), Number(b.retenue_absences_gnf), Number(b.primes_gnf), Number(b.brut_gnf), Number(b.cnss_salarie_gnf), Number(b.cnss_employeur_gnf), Number(b.rts_gnf), Number(b.avances_gnf), Number(b.net_gnf), MODES_PAIEMENT_SALAIRE[b.employes?.mode_paiement ?? ""] ?? "", b.employes?.compte_paiement ?? ""])}
          />
        </div>
        <Tableau entetes={["Employé", "Base", "Heures sup.", "Absences", valide ? "Primes / avances" : "Primes / avances (GNF)", "Brut", "CNSS", "RTS", "Net à payer"]}>
          {lignes.map((b) => (
            <tr key={b.id}>
              <Cellule>
                <Link href={`/rh/paie/${m}/${b.employe_id}`} className="font-semibold text-papel-700 hover:underline">
                  {b.employes ? nomComplet(b.employes) : "—"}
                </Link>
                <span className="block font-mono text-xs text-gray-500">{b.employes?.matricule}</span>
              </Cellule>
              <Cellule>{gnf(Number(b.salaire_base_gnf))}</Cellule>
              <Cellule>{Number(b.heures_sup) ? `${nombre(Number(b.heures_sup), 1)} h · ${gnf(Number(b.montant_heures_sup_gnf))}` : "—"}</Cellule>
              <Cellule>{Number(b.jours_absence_non_payee) ? <span className="text-red-700">{nombre(Number(b.jours_absence_non_payee), 1)} j · −{gnf(Number(b.retenue_absences_gnf))}</span> : "—"}</Cellule>
              <Cellule>{valide ? `${gnf(Number(b.primes_gnf))} / ${gnf(Number(b.avances_gnf))}` : <ModifBulletin id={b.id} primes={Number(b.primes_gnf)} avances={Number(b.avances_gnf)} />}</Cellule>
              <Cellule>{gnf(Number(b.brut_gnf))}</Cellule>
              <Cellule>{gnf(Number(b.cnss_salarie_gnf))}</Cellule>
              <Cellule>{gnf(Number(b.rts_gnf))}</Cellule>
              <Cellule className="font-bold">{gnf(Number(b.net_gnf))}</Cellule>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}
