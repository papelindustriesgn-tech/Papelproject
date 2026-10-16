import type { Metadata } from "next";
import Link from "next/link";
import { ExportCsv } from "@/components/donnees/export-csv";
import { BarreFiltres, lireParam, motifRecherche } from "@/components/donnees/filtres";
import { Badge, Carte, Cellule, classesBouton, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { lireSeuils } from "@/lib/parametres";
import { MODES_PAIEMENT_SALAIRE, nomComplet } from "@/lib/rh/libelles";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Employés" };

export default async function PageEmployes({ searchParams }: PageProps<"/rh/employes">) {
  const sp = await searchParams;
  const q = lireParam(sp, "q");
  const service = lireParam(sp, "service");
  const contrat = lireParam(sp, "contrat");
  const etat = lireParam(sp, "etat") ?? "actifs";
  const jour = aujourdhui();
  const { rh_alerte_fin_contrat_jours: n } = await lireSeuils({ rh_alerte_fin_contrat_jours: 30 });
  const limite = new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const supabase = await clientServeur();
  let requete = supabase.from("employes").select("*, departements(libelle), fonctions(libelle), types_contrats(libelle)").order("nom").limit(1000);
  if (etat === "actifs") requete = requete.eq("actif", true);
  if (etat === "sortis") requete = requete.eq("actif", false);
  if (q) requete = requete.or(`nom.ilike.${motifRecherche(q)},prenom.ilike.${motifRecherche(q)},matricule.ilike.${motifRecherche(q)},telephone.ilike.${motifRecherche(q)}`);
  if (service) requete = requete.eq("departement_id", service);
  if (contrat === "echeance") requete = requete.gte("date_fin_contrat", jour).lte("date_fin_contrat", limite);
  else if (contrat) requete = requete.eq("type_contrat_id", contrat);
  const [{ data }, { data: services }, { data: contrats }] = await Promise.all([
    requete,
    supabase.from("departements").select("id, libelle").eq("actif", true).order("ordre"),
    supabase.from("types_contrats").select("id, libelle").eq("actif", true).order("ordre"),
  ]);
  const lignes = data ?? [];
  return (
    <>
      <TitrePage
        titre="Employés"
        sousTitre={`${lignes.length} employé(s)`}
        action={
          <Link href="/rh/employes/nouveau" className={classesBouton()}>
            Nouvel employé
          </Link>
        }
      />
      <Carte>
        <BarreFiltres
          recherche={q}
          placeholder="Nom, matricule, téléphone"
          valeurs={{ service, contrat, etat: lireParam(sp, "etat") }}
          filtres={[
            { nom: "service", libelle: "Service", options: (services ?? []).map((s) => ({ valeur: s.id, libelle: s.libelle })) },
            { nom: "contrat", libelle: "Contrat", options: [{ valeur: "echeance", libelle: `Se termine dans ${n} j` }, ...(contrats ?? []).map((c) => ({ valeur: c.id, libelle: c.libelle }))] },
            { nom: "etat", libelle: "Présence dans l'entreprise (par défaut : actifs)", options: [{ valeur: "sortis", libelle: "Sortis" }, { valeur: "tous", libelle: "Tous" }] },
          ]}
          action={
            <ExportCsv
              nomFichier="employes"
              entetes={["Matricule", "Nom", "Prénom", "Sexe", "Service", "Fonction", "Contrat", "Embauche", "Fin de contrat", "Salaire de base (GNF)", "N° CNSS", "Téléphone", "Paiement", "Compte", "Actif", "Sortie", "Motif de sortie"]}
              lignes={lignes.map((e) => [e.matricule, e.nom, e.prenom, e.sexe ?? "", e.departements?.libelle ?? "", e.fonctions?.libelle ?? "", e.types_contrats?.libelle ?? "", e.date_embauche, e.date_fin_contrat ?? "", Number(e.salaire_base_gnf), e.numero_cnss, e.telephone, MODES_PAIEMENT_SALAIRE[e.mode_paiement] ?? e.mode_paiement, e.compte_paiement, e.actif ? "oui" : "non", e.date_sortie ?? "", e.motif_sortie])}
            />
          }
        />
        <Tableau entetes={["Matricule", "Employé", "Service · fonction", "Contrat", "Embauche", "Salaire de base", ""]}>
          {lignes.map((e) => {
            const echeance = e.actif && e.date_fin_contrat && e.date_fin_contrat <= limite;
            return (
              <tr key={e.id}>
                <Cellule>
                  <Link href={`/rh/employes/${e.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                    {e.matricule}
                  </Link>
                </Cellule>
                <Cellule className="font-semibold">{nomComplet(e)}</Cellule>
                <Cellule>{[e.departements?.libelle, e.fonctions?.libelle].filter(Boolean).join(" · ") || "—"}</Cellule>
                <Cellule>
                  {e.types_contrats?.libelle ?? "—"}
                  {e.date_fin_contrat && <span className={`block text-sm ${echeance ? "font-semibold text-amber-800" : "text-gray-500"}`}>jusqu&apos;au {formaterDate(e.date_fin_contrat)}</span>}
                </Cellule>
                <Cellule>{formaterDate(e.date_embauche)}</Cellule>
                <Cellule>{gnf(Number(e.salaire_base_gnf))}</Cellule>
                <Cellule>{!e.actif ? <Badge ton="neutre">Sorti</Badge> : echeance ? <Badge ton="alerte">Fin de contrat proche</Badge> : null}</Cellule>
              </tr>
            );
          })}
        </Tableau>
        {!lignes.length && <p className="py-4 text-gray-700">Aucun employé. Créez le premier avec « Nouvel employé ».</p>}
      </Carte>
    </>
  );
}
