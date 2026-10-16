import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { formaterDate } from "@/lib/formulaires/dates";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { libelleMois, MODES_PAIEMENT_SALAIRE, nomComplet } from "@/lib/rh/libelles";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { parametresVente } from "@/lib/ventes/parametres";
import { clientServeur } from "@/lib/supabase/serveur";

/** Bulletin de paie imprimable (A4). */
export default async function Bulletin({ params }: PageProps<"/rh/paie/[mois]/[employe]">) {
  const { mois: m, employe } = await params;
  if (!/^\d{4}-\d{2}$/.test(m)) notFound();
  const mois = `${m}-01`;
  const supabase = await clientServeur();
  const [{ data: b }, { data: periode }, { entreprise }] = await Promise.all([
    supabase.from("bulletins").select("*, employes(matricule, nom, prenom, numero_cnss, date_embauche, mode_paiement, compte_paiement, departements(libelle), fonctions(libelle), types_contrats(libelle))").eq("mois", mois).eq("employe_id", employe).maybeSingle(),
    supabase.from("periodes_paie").select("statut").eq("mois", mois).maybeSingle(),
    parametresVente(),
  ]);
  if (!b || !b.employes) notFound();
  const e = b.employes;
  const lignes: [string, string, number][] = [
    ["Salaire de base", "", Number(b.salaire_base_gnf)],
    ...(Number(b.heures_sup) ? ([["Heures supplémentaires", `${nombre(Number(b.heures_sup), 1)} h`, Number(b.montant_heures_sup_gnf)]] as [string, string, number][]) : []),
    ...(Number(b.primes_gnf) ? ([["Primes", "", Number(b.primes_gnf)]] as [string, string, number][]) : []),
    ...(Number(b.retenue_absences_gnf) ? ([["Absences non payées", `${nombre(Number(b.jours_absence_non_payee), 1)} j`, -Number(b.retenue_absences_gnf)]] as [string, string, number][]) : []),
  ];
  const retenues: [string, number][] = [
    ["CNSS (part salariale)", Number(b.cnss_salarie_gnf)],
    ["Impôt sur salaire (RTS)", Number(b.rts_gnf)],
    ...(Number(b.avances_gnf) ? ([["Avances sur salaire", Number(b.avances_gnf)]] as [string, number][]) : []),
  ];
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-[15px] text-black print:max-w-none print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href={`/rh/paie/${m}`} className="text-papel-700 underline">
          ← Retour à la paie
        </Link>
        <BoutonImprimer />
      </div>
      <header className="imprimer-couleurs flex items-start justify-between gap-4 rounded bg-papel-700 p-4 text-white">
        <div>
          <Image src="/logo-papel.png" alt="Papel" width={120} height={68} />
          <div className="mt-2 text-sm">
            <div className="font-semibold">{entreprise.nom}</div>
            <div>{entreprise.adresse}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">BULLETIN DE PAIE</div>
          <div className="text-lg capitalize">{libelleMois(mois)}</div>
          {periode?.statut !== "validee" && <div className="mt-1 rounded bg-white/20 px-2 text-sm">Provisoire (paie non validée)</div>}
        </div>
      </header>
      <section className="my-4 grid grid-cols-2 gap-3 rounded border border-gray-300 p-3 text-sm">
        <div>
          <div className="text-base font-bold">{nomComplet(e)}</div>
          <div>Matricule : {e.matricule}</div>
          <div>{[e.fonctions?.libelle, e.departements?.libelle].filter(Boolean).join(" · ")}</div>
        </div>
        <div>
          <div>Contrat : {e.types_contrats?.libelle ?? "—"}</div>
          <div>Embauche : {formaterDate(e.date_embauche)}</div>
          <div>N° CNSS : {e.numero_cnss || "—"}</div>
          <div>Paiement : {MODES_PAIEMENT_SALAIRE[e.mode_paiement]}{e.compte_paiement ? ` (${e.compte_paiement})` : ""}</div>
        </div>
      </section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1.5">Rubrique</th>
            <th className="py-1.5">Base</th>
            <th className="py-1.5 text-right">Montant (GNF)</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(([l, base, mt]) => (
            <tr key={l} className="border-b border-gray-200">
              <td className="py-1.5">{l}</td>
              <td className="py-1.5">{base}</td>
              <td className="py-1.5 text-right tabular-nums">{gnf(mt)}</td>
            </tr>
          ))}
          <tr className="border-b border-black font-bold">
            <td className="py-1.5" colSpan={2}>Salaire brut</td>
            <td className="py-1.5 text-right tabular-nums">{gnf(Number(b.brut_gnf))}</td>
          </tr>
          {retenues.map(([l, mt]) => (
            <tr key={l} className="border-b border-gray-200">
              <td className="py-1.5" colSpan={2}>{l}</td>
              <td className="py-1.5 text-right tabular-nums">− {gnf(mt)}</td>
            </tr>
          ))}
          <tr className="imprimer-couleurs bg-papel-700 text-base font-bold text-white">
            <td className="px-2 py-2" colSpan={2}>NET À PAYER</td>
            <td className="px-2 py-2 text-right tabular-nums">{gnf(Number(b.net_gnf))}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-sm">Arrêté le présent bulletin à la somme de : <strong>{montantEnLettresGnf(Number(b.net_gnf))}</strong>.</p>
      <p className="mt-1 text-xs text-gray-600">Charges patronales (pour information) : CNSS employeur {gnf(Number(b.cnss_employeur_gnf))}.</p>
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-gray-400 pt-1">Signature de l&apos;employeur</div>
        <div className="border-t border-gray-400 pt-1">Signature de l&apos;employé (« reçu »)</div>
      </div>
    </div>
  );
}
