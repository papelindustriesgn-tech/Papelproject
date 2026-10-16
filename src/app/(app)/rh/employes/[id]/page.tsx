import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { libelleMois, nomComplet, STATUTS_ABSENCE } from "@/lib/rh/libelles";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireEmploye, FormulaireSortie } from "../../formulaires";

export const metadata: Metadata = { title: "Dossier employé" };

export default async function DossierEmploye({ params }: PageProps<"/rh/employes/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: e }, { data: solde }, { data: absences }, { data: bulletins }, { data: departements }, { data: fonctions }, { data: contrats }] = await Promise.all([
    supabase.from("employes").select("*, departements(libelle), fonctions(libelle), types_contrats(libelle)").eq("id", id).maybeSingle(),
    supabase.from("soldes_conges").select("acquis, pris, solde").eq("employe_id", id).maybeSingle(),
    supabase.from("absences").select("id, du, au, nb_jours, statut, motif, types_absences(libelle)").eq("employe_id", id).order("du", { ascending: false }).limit(30),
    supabase.from("bulletins").select("mois, brut_gnf, net_gnf").eq("employe_id", id).order("mois", { ascending: false }).limit(12),
    supabase.from("departements").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("fonctions").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("types_contrats").select("id, libelle").eq("actif", true).order("ordre"),
  ]);
  if (!e) notFound();
  return (
    <>
      <TitrePage
        fil={[{ libelle: "Employés", href: "/rh/employes" }]}
        titre={`${e.matricule} – ${nomComplet(e)}`}
        sousTitre={[e.fonctions?.libelle, e.departements?.libelle, e.types_contrats?.libelle, `embauché le ${formaterDate(e.date_embauche)}`].filter(Boolean).join(" · ")}
        action={!e.actif ? <Badge ton="neutre">Sorti le {formaterDate(e.date_sortie)}</Badge> : undefined}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Solde de congés" valeur={`${nombre(Number(solde?.solde ?? 0), 1)} j`} detail={`Acquis ${nombre(Number(solde?.acquis ?? 0), 1)} j · pris ${nombre(Number(solde?.pris ?? 0), 1)} j`} ton={Number(solde?.solde ?? 0) < 0 ? "danger" : "normal"} lien="/rh/absences" />
        <Indicateur libelle="Salaire de base" valeur={gnf(Number(e.salaire_base_gnf))} detail="Mensuel" />
        <Indicateur libelle="Dernier net payé" valeur={bulletins?.[0] ? gnf(Number(bulletins[0].net_gnf)) : "—"} detail={bulletins?.[0] ? libelleMois(bulletins[0].mois) : "Pas encore de paie"} lien={bulletins?.[0] ? `/rh/paie/${bulletins[0].mois.slice(0, 7)}/${id}` : undefined} />
        <Indicateur libelle="Fin de contrat" valeur={e.date_fin_contrat ? formaterDate(e.date_fin_contrat) : "—"} detail={e.date_fin_contrat ? undefined : "Contrat sans fin prévue"} />
      </div>
      <Carte titre="Dossier" className="mb-4">
        <FormulaireEmploye
          id={id}
          initial={{ ...e, salaire_base_gnf: Number(e.salaire_base_gnf) }}
          departements={departements ?? []}
          fonctions={fonctions ?? []}
          contrats={contrats ?? []}
        />
      </Carte>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Carte titre="Congés et absences">
          {absences?.length ? (
            <Tableau entetes={["Type", "Du", "Au", "Jours", "Statut"]}>
              {absences.map((a) => (
                <tr key={a.id}>
                  <Cellule>{a.types_absences?.libelle}</Cellule>
                  <Cellule>{formaterDate(a.du)}</Cellule>
                  <Cellule>{formaterDate(a.au)}</Cellule>
                  <Cellule>{a.nb_jours}</Cellule>
                  <Cellule><Badge ton={STATUTS_ABSENCE[a.statut].ton}>{STATUTS_ABSENCE[a.statut].libelle}</Badge></Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Aucune absence enregistrée.</p>
          )}
        </Carte>
        <Carte titre="Bulletins de paie">
          {bulletins?.length ? (
            <Tableau entetes={["Mois", "Brut", "Net à payer"]}>
              {bulletins.map((b) => (
                <tr key={b.mois}>
                  <Cellule>
                    <Link href={`/rh/paie/${b.mois.slice(0, 7)}/${id}`} className="font-semibold text-papel-700 hover:underline">
                      {libelleMois(b.mois)}
                    </Link>
                  </Cellule>
                  <Cellule>{gnf(Number(b.brut_gnf))}</Cellule>
                  <Cellule className="font-semibold">{gnf(Number(b.net_gnf))}</Cellule>
                </tr>
              ))}
            </Tableau>
          ) : (
            <p className="text-gray-700">Pas encore de bulletin.</p>
          )}
        </Carte>
      </div>
      {e.actif && (
        <Carte titre="Départ de l'entreprise">
          <p className="mb-2 text-sm text-gray-600">L&apos;employé reste dans l&apos;historique (paie, absences) mais n&apos;apparaît plus dans les présences ni les prochaines paies.</p>
          <FormulaireSortie id={id} />
        </Carte>
      )}
    </>
  );
}
