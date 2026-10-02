import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { libelleAlerte, minutes, pct } from "@/lib/production/affichage";
import { chargerFiches } from "@/lib/production/indicateurs";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { supprimerFiche, supprimerLigneFiche } from "../../actions";
import { BoutonValider, FormulaireArret, FormulaireConsommation, FormulaireEnTete, FormulaireOperateurs, FormulaireProduction } from "./formulaires";

function BoutonSupprimerLigne({ table, id, ficheId }: { table: "fiche_consommations" | "fiche_productions" | "fiche_arrets"; id: string; ficheId: string }) {
  return (
    <form action={supprimerLigneFiche.bind(null, table, id, ficheId)}>
      <button className="min-h-11 px-2 font-semibold text-red-700 underline" aria-label="Supprimer la ligne">
        Supprimer
      </button>
    </form>
  );
}

export default async function PageFiche({ params }: PageProps<"/production/fiches/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: f } = await supabase
    .from("fiches_production")
    .select(
      `id, date_production, statut, notes, equipe_id, of_id, ligne_id, duree_poste_min, cout_matiere_gnf, validee_le,
       postes(libelle, heure_debut, heure_fin), lignes_production(libelle),
       fiche_productions(id, paquets, rebuts_kg, cout_unitaire_gnf, conditionnements(libelle, paquets_par_colis, produits(libelle))),
       fiche_consommations(id, quantite, articles(libelle, unite), lots(numero_lot)),
       fiche_arrets(id, duree_min, heure_debut, commentaire, causes_arret(libelle, type_arret)),
       fiche_operateurs(operateur_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!f) notFound();
  const modifiable = f.statut === "brouillon";

  const [[calcul], { data: conditionnements }, { data: articles }, { data: lots }, { data: causes }, { data: operateurs }, { data: equipes }, { data: ordres }] = await Promise.all([
    chargerFiches({ du: f.date_production, au: f.date_production, inclureBrouillons: true, ids: [id] }),
    supabase.from("conditionnements").select("id, libelle, paquets_par_colis, produits(libelle, actif)").eq("actif", true),
    supabase.from("etat_stock").select("article_id, libelle, unite, suivi_par_lot, famille").eq("actif", true).in("famille", ["matiere_premiere", "emballage"]).order("famille").order("libelle"),
    supabase.from("etat_lots").select("id, article_id, numero_lot, poids_restant_kg").gt("poids_restant_kg", 0).eq("statut", "disponible").order("date_reception"),
    supabase.from("causes_arret").select("id, libelle, type_arret").eq("actif", true).order("libelle"),
    supabase.from("operateurs").select("id, nom, prenom, equipes(libelle)").eq("actif", true).order("nom"),
    supabase.from("equipes").select("id, libelle").eq("actif", true).order("libelle"),
    supabase.from("of_avancement").select("id, numero, produit_libelle, conditionnement_libelle").in("statut", ["planifie", "en_cours"]).order("numero"),
  ]);
  const ind = calcul?.indicateurs;
  const avertissements: string[] = [];
  if (!f.fiche_consommations.length && f.fiche_productions.length) avertissements.push("Aucune bobine consommée n'est saisie.");
  if (!f.fiche_operateurs.length) avertissements.push("Aucun opérateur présent n'est coché.");
  for (const a of calcul?.alertes ?? []) avertissements.push(libelleAlerte(a));

  return (
    <>
      <Link href="/production/fiches" className="text-papel-700 underline">
        ← Fiches de poste
      </Link>
      <TitrePage
        titre={`${f.postes?.libelle} du ${formaterDate(f.date_production)}`}
        sousTitre={`${f.lignes_production?.libelle} · ${f.postes?.heure_debut.slice(0, 5)} – ${f.postes?.heure_fin.slice(0, 5)} · durée ${minutes(f.duree_poste_min)}`}
        action={modifiable ? <Badge ton="alerte">Brouillon</Badge> : <Badge ton="succes">Validée {f.validee_le ? `le ${formaterDateHeure(f.validee_le)}` : ""}</Badge>}
      />

      {calcul && calcul.alertes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="status">
          {calcul.alertes.map((a, i) => (
            <Badge key={i} ton="erreur">
              ⚠ {libelleAlerte(a)}
            </Badge>
          ))}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Papier consommé" valeur={`${nombre(calcul?.papierKg ?? 0)} kg`} detail={`${nombre(ind?.paquetsBons ?? 0)} paquets bons`} />
        <Indicateur
          libelle="Rendement réel / théorique"
          valeur={pct(ind?.ratioRendement)}
          detail={ind?.rendementReelPaquetsT ? `${nombre(ind.rendementReelPaquetsT)} paquets/t` : "Plusieurs produits : ratio pondéré"}
          ton={calcul?.alertes.some((a) => a.type === "rendement_faible") ? "danger" : "normal"}
        />
        <Indicateur libelle="Taux de perte" valeur={pct(ind?.tauxPerte)} ton={calcul?.alertes.some((a) => a.type === "perte_elevee") ? "danger" : "normal"} detail={`Arrêts non planifiés : ${minutes(ind?.minutesArretNonPlanifie ?? 0)}`} />
        <Indicateur
          libelle="TRS"
          valeur={pct(ind?.trs)}
          detail={ind?.trs === null ? "Renseignez la cadence nominale (Listes → Cadences)" : `Dispo ${pct(ind?.disponibilite, 0)} · Perf ${pct(ind?.performance, 0)} · Qualité ${pct(ind?.qualite, 0)}`}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Carte titre="Production">
          <Tableau entetes={["Produit", "Production", "Rebuts", "Coût de revient", ""]}>
            {f.fiche_productions.map((l) => (
              <tr key={l.id}>
                <Cellule>{l.conditionnements?.produits?.libelle} – {l.conditionnements?.libelle}</Cellule>
                <Cellule className="font-semibold">{formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })}</Cellule>
                <Cellule>{nombre(l.rebuts_kg, 1)} kg</Cellule>
                <Cellule>{l.cout_unitaire_gnf === null ? "À la validation" : `${gnf(l.cout_unitaire_gnf)} / paquet`}</Cellule>
                <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_productions" id={l.id} ficheId={f.id} />}</Cellule>
              </tr>
            ))}
          </Tableau>
          {modifiable && (
            <div className="mt-3">
              <FormulaireProduction
                ficheId={f.id}
                conditionnements={(conditionnements ?? [])
                  .filter((c) => c.produits?.actif)
                  .map((c) => ({ id: c.id, libelle: `${c.produits?.libelle} – ${c.libelle}`, paquetsParColis: c.paquets_par_colis }))
                  .sort((a, b) => a.libelle.localeCompare(b.libelle))}
              />
            </div>
          )}
        </Carte>

        <Carte titre="Bobines et emballages consommés">
          <Tableau entetes={["Article", "Bobine", "Quantité", ""]}>
            {f.fiche_consommations.map((c) => (
              <tr key={c.id}>
                <Cellule>{c.articles?.libelle}</Cellule>
                <Cellule className="font-mono">{c.lots?.numero_lot ?? "—"}</Cellule>
                <Cellule className="font-semibold">
                  {nombre(c.quantite, 3)} {c.articles?.unite}
                </Cellule>
                <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_consommations" id={c.id} ficheId={f.id} />}</Cellule>
              </tr>
            ))}
          </Tableau>
          {!modifiable && f.cout_matiere_gnf !== null && <p className="mt-2 text-gray-700">Coût matière du poste : {gnf(f.cout_matiere_gnf)}</p>}
          {modifiable && (
            <div className="mt-3">
              <FormulaireConsommation
                ficheId={f.id}
                articles={(articles ?? []).map((a) => ({ id: a.article_id!, libelle: a.libelle!, suiviParLot: !!a.suivi_par_lot, unite: a.unite! }))}
                lots={(lots ?? []).map((l) => ({ id: l.id!, articleId: l.article_id!, libelle: `${l.numero_lot} — reste ${nombre(l.poids_restant_kg, 1)} kg` }))}
              />
            </div>
          )}
        </Carte>

        <Carte titre="Arrêts">
          <Tableau entetes={["Cause", "Type", "Durée", "Début", "Commentaire", ""]}>
            {f.fiche_arrets.map((a) => (
              <tr key={a.id}>
                <Cellule>{a.causes_arret?.libelle}</Cellule>
                <Cellule>{a.causes_arret?.type_arret === "planifie" ? <Badge ton="neutre">Planifié</Badge> : <Badge ton="alerte">Non planifié</Badge>}</Cellule>
                <Cellule className="font-semibold">{minutes(a.duree_min)}</Cellule>
                <Cellule>{a.heure_debut?.slice(0, 5) ?? "—"}</Cellule>
                <Cellule className="text-sm">{a.commentaire}</Cellule>
                <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_arrets" id={a.id} ficheId={f.id} />}</Cellule>
              </tr>
            ))}
          </Tableau>
          {modifiable && (
            <div className="mt-3">
              <FormulaireArret ficheId={f.id} causes={(causes ?? []).map((c) => ({ id: c.id, libelle: `${c.libelle}${c.type_arret === "planifie" ? " (planifié)" : ""}` }))} />
            </div>
          )}
        </Carte>

        <Carte titre={`Opérateurs présents (${f.fiche_operateurs.length})`}>
          <FormulaireOperateurs
            ficheId={f.id}
            modifiable={modifiable}
            presents={f.fiche_operateurs.map((o) => o.operateur_id)}
            operateurs={(operateurs ?? []).map((o) => ({ id: o.id, libelle: `${o.prenom} ${o.nom}`, equipe: o.equipes?.libelle ?? "" }))}
          />
        </Carte>

        <Carte titre="Équipe, ordre de fabrication et notes">
          <FormulaireEnTete
            ficheId={f.id}
            modifiable={modifiable}
            equipes={equipes ?? []}
            ordres={(ordres ?? []).map((o) => ({ id: o.id!, libelle: `${o.numero} – ${o.produit_libelle} (${o.conditionnement_libelle})` }))}
            valeurs={{ equipe_id: f.equipe_id ?? "", of_id: f.of_id ?? "", notes: f.notes }}
          />
        </Carte>

        {modifiable && (
          <>
            <BoutonValider ficheId={f.id} avertissements={avertissements} />
            <form action={supprimerFiche.bind(null, f.id)}>
              <Bouton type="submit" variante="discret">
                Supprimer ce brouillon
              </Bouton>
            </form>
          </>
        )}
      </div>
    </>
  );
}
