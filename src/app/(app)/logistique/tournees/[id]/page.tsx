import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BarreEtapes, Carte, Cellule, etapesStatut, Tableau, TitrePage } from "@/components/ui";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { STATUTS_REMISE, STATUTS_TOURNEE } from "@/lib/logistique/libelles";
import { coutParColis } from "@/lib/metier/logistique";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { annulerTournee, retirerLivraison, supprimerDepense } from "../../actions";
import { BoutonCharger, FormulaireDepart, FormulaireDepense, FormulaireRetour } from "./formulaires";

const SELECT_BL =
  "id, numero, date_livraison, ordre, statut_remise, receptionnaire, remise_le, pieces_vente(numero, clients(nom, adresse, telephone, quartiers(nom))), lignes_livraison(id, paquets, paquets_retournes, conditionnements(libelle, paquets_par_colis, produits(libelle)))";

type Ligne = { paquets: number; paquets_retournes: number; conditionnements: { libelle: string; paquets_par_colis: number; produits: { libelle: string } | null } | null };

function contenu(lignes: Ligne[]): string {
  return lignes
    .map((l) => `${l.conditionnements?.produits?.libelle ?? ""} ${l.conditionnements?.libelle ?? ""} : ${formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })}`)
    .join(" · ");
}

export default async function PageTournee({ params }: PageProps<"/logistique/tournees/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: t }, { data: bons }, { data: depenses }, { data: types }] = await Promise.all([
    supabase.from("tournees_livraison_etat").select("*").eq("id", id).maybeSingle(),
    supabase.from("livraisons").select(SELECT_BL).eq("tournee_id", id).order("ordre"),
    supabase.from("depenses_tournee").select("id, montant_gnf, reference, types_depenses_tournee(libelle)").eq("tournee_id", id).order("created_at"),
    supabase.from("types_depenses_tournee").select("id, libelle").eq("actif", true).order("ordre"),
  ]);
  if (!t) notFound();
  const planifiee = t.statut === "planifiee";
  const enCours = t.statut === "en_cours";
  const { data: aPlanifier } = planifiee
    ? await supabase.from("livraisons").select(SELECT_BL).eq("statut", "validee").is("tournee_id", null).eq("statut_remise", "a_livrer").order("date_livraison").limit(100)
    : { data: [] };

  return (
    <>
      <Link href="/logistique/tournees" className="text-papel-700 underline print:hidden">← Tournées</Link>
      <TitrePage
        titre={`Tournée ${t.numero}`}
        sousTitre={`${formaterDate(t.date_tournee)} · ${t.immatriculation} · ${t.chauffeur_nom}`}
        action={<BarreEtapes etapes={etapesStatut(STATUTS_TOURNEE, ["planifiee", "en_cours", "terminee"], t.statut!)} courante={t.statut!} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Indicateur
          libelle="Chargement"
          valeur={`${nombre(t.colis_charges)} colis`}
          detail={t.capacite_colis ? `Capacité : ${nombre(t.capacite_colis)} colis` : `${nombre(t.paquets_charges)} paquets`}
          ton={t.capacite_colis && Number(t.colis_charges) > t.capacite_colis ? "danger" : "normal"}
        />
        <Indicateur libelle="Remises" valeur={`${t.nb_remises} / ${t.nb_livraisons}`} detail={`${t.nb_partielles} partielle(s) · ${t.nb_refusees} refus`} />
        <Indicateur libelle="Kilomètres" valeur={t.km_parcourus === null ? "—" : `${nombre(t.km_parcourus)} km`} detail={t.depart_le ? `Départ ${formaterDateHeure(t.depart_le)}` : undefined} />
        <Indicateur libelle="Dépenses" valeur={gnf(t.depenses_gnf)} detail={coutParColis(Number(t.depenses_gnf), Number(t.colis_livres)) === null ? undefined : `${gnf(coutParColis(Number(t.depenses_gnf), Number(t.colis_livres)))} / colis livré`} />
      </div>

      <div className="flex flex-col gap-4">
        <Carte titre={`Feuille de route (${bons?.length ?? 0} bon(s))`} action={<BoutonImprimer />}>
          <Tableau entetes={["#", "Bon", "Client", "Adresse", "Contenu", "Remise", ""]}>
            {(bons ?? []).map((b, i) => {
              const client = b.pieces_vente?.clients;
              const r = STATUTS_REMISE[b.statut_remise];
              return (
                <tr key={b.id}>
                  <Cellule>{i + 1}</Cellule>
                  <Cellule className="font-mono">{b.numero}</Cellule>
                  <Cellule>
                    {client?.nom}
                    {client?.telephone && <span className="block text-sm text-gray-600">{client.telephone}</span>}
                  </Cellule>
                  <Cellule className="text-sm">{[client?.adresse, client?.quartiers?.nom].filter(Boolean).join(", ") || "—"}</Cellule>
                  <Cellule className="text-sm">{contenu(b.lignes_livraison as Ligne[])}</Cellule>
                  <Cellule>
                    <Badge ton={r.ton}>{r.libelle}</Badge>
                    {b.remise_le && <span className="block text-sm text-gray-600">{formaterDateHeure(b.remise_le)}{b.receptionnaire ? ` · ${b.receptionnaire}` : ""}</span>}
                  </Cellule>
                  <Cellule className="print:hidden">
                    {planifiee && (
                      <form action={retirerLivraison.bind(null, t.id!, b.id)}>
                        <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                      </form>
                    )}
                    {!planifiee && (
                      <Link href={`/logistique/livraisons/${b.id}`} className="inline-flex min-h-11 items-center font-semibold text-papel-700 underline">
                        {enCours && b.statut_remise === "a_livrer" ? "Saisir la remise" : "Détail"}
                      </Link>
                    )}
                  </Cellule>
                </tr>
              );
            })}
          </Tableau>
          <div className="mt-6 hidden gap-16 print:flex">
            <p>Chauffeur : ____________________</p>
            <p>Magasin : ____________________</p>
          </div>
        </Carte>

        {planifiee && (
          <Carte titre={`Bons de livraison à planifier (${aPlanifier?.length ?? 0})`} className="print:hidden">
            {aPlanifier && aPlanifier.length > 0 ? (
              <Tableau entetes={["Bon", "Date", "Client", "Contenu", ""]}>
                {aPlanifier.map((b) => (
                  <tr key={b.id}>
                    <Cellule className="font-mono">{b.numero}</Cellule>
                    <Cellule className="whitespace-nowrap">{formaterDate(b.date_livraison)}</Cellule>
                    <Cellule>{b.pieces_vente?.clients?.nom}</Cellule>
                    <Cellule className="text-sm">{contenu(b.lignes_livraison as Ligne[])}</Cellule>
                    <Cellule><BoutonCharger tourneeId={t.id!} livraisonId={b.id} /></Cellule>
                  </tr>
                ))}
              </Tableau>
            ) : (
              <p className="text-gray-700">Aucun bon de livraison validé en attente (les bons sont validés dans Ventes → Livraisons).</p>
            )}
          </Carte>
        )}

        {planifiee && (
          <Carte titre="Départ" className="print:hidden">
            <FormulaireDepart tourneeId={t.id!} />
            <form action={annulerTournee.bind(null, t.id!)} className="mt-3">
              <button className="min-h-11 font-semibold text-red-700 underline">Annuler la tournée</button>
            </form>
          </Carte>
        )}

        {(enCours || t.statut === "terminee") && (
          <Carte titre="Dépenses de la tournée" className="print:hidden">
            <Tableau entetes={["Dépense", "Montant", "Reçu", ""]}>
              {(depenses ?? []).map((d) => (
                <tr key={d.id}>
                  <Cellule>{d.types_depenses_tournee?.libelle}</Cellule>
                  <Cellule>{gnf(d.montant_gnf)}</Cellule>
                  <Cellule>{d.reference || "—"}</Cellule>
                  <Cellule>
                    <form action={supprimerDepense.bind(null, d.id, t.id!)}>
                      <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                    </form>
                  </Cellule>
                </tr>
              ))}
            </Tableau>
            <div className="mt-3">
              <FormulaireDepense tourneeId={t.id!} types={types ?? []} />
            </div>
          </Carte>
        )}

        {enCours && (
          <Carte titre="Retour à l'usine" className="print:hidden">
            <FormulaireRetour tourneeId={t.id!} />
          </Carte>
        )}
      </div>
    </>
  );
}
