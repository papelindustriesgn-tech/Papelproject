import { Check } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, BarreEtapes, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { nomUnite, formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { libelleAlerte, minutes, pct } from "@/lib/production/affichage";
import { chargerFiches } from "@/lib/production/indicateurs";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { supprimerFiche, supprimerLigneFiche } from "../../actions";
import { AjoutOperateur, BoutonValider, FormulaireArret, FormulaireConsommation, FormulaireEnTete, FormulaireOperateurs, FormulaireProduction } from "./formulaires";

function BoutonSupprimerLigne({ table, id, ficheId }: { table: "fiche_consommations" | "fiche_productions" | "fiche_arrets"; id: string; ficheId: string }) {
  return (
    <form action={supprimerLigneFiche.bind(null, table, id, ficheId)}>
      <button className="min-h-11 px-2 font-semibold text-red-700 underline" aria-label="Supprimer la ligne">
        Supprimer
      </button>
    </form>
  );
}

/** Étape numérotée de la saisie : un numéro, une question simple, une coche verte quand c'est rempli. */
function Etape({
  numero,
  titre,
  question,
  faite,
  facultative,
  modifiable,
  children,
}: {
  numero: number;
  titre: string;
  question?: string;
  faite: boolean;
  facultative?: boolean;
  modifiable: boolean;
  children: ReactNode;
}) {
  return (
    <section className="ombre-carte min-w-0 rounded-2xl bg-white p-4 md:p-5" aria-labelledby={`etape-${numero}`}>
      <header className="mb-3 flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${faite ? "bg-green-600 text-white" : "bg-papel-100 text-papel-800"}`}
          aria-hidden
        >
          {faite ? <Check size={18} /> : numero}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`etape-${numero}`} className="text-[1.08rem] font-semibold text-gray-900">
            {modifiable && <span className="sr-only">Étape {numero} : </span>}
            {titre}
            {facultative && modifiable && <span className="ml-2 text-sm font-normal text-gray-500">(si besoin)</span>}
            {faite && modifiable && <span className="sr-only"> (rempli)</span>}
          </h2>
          {question && modifiable && <p className="text-sm text-gray-600">{question}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export default async function PageFiche({ params }: PageProps<"/production/fiches/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: f } = await supabase
    .from("fiches_production")
    .select(
      `id, date_production, statut, notes, equipe_id, of_id, ligne_id, duree_poste_min, cout_matiere_gnf, validee_le, code_lot,
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
  if (!f.fiche_consommations.length && f.fiche_productions.length) avertissements.push("Étape 3 vide : aucune bobine n'est saisie.");
  if (!f.fiche_operateurs.length) avertissements.push("Étape 1 vide : personne n'est coché comme présent.");
  for (const a of calcul?.alertes ?? []) avertissements.push(libelleAlerte(a));

  // Résultats du poste : à la fin pendant la saisie (on remplit d'abord), en haut une fois la fiche validée.
  const resultats = (
    <Carte titre={modifiable ? "Résultat du poste (calculé au fur et à mesure)" : "Résultat du poste"}>
      {calcul && calcul.alertes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" role="status">
          {calcul.alertes.map((a, i) => (
            <Badge key={i} ton="erreur">
              ⚠ {libelleAlerte(a)}
            </Badge>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Papier utilisé" valeur={`${nombre(calcul?.papierKg ?? 0)} kg`} detail={`${nombre(ind?.paquetsBons ?? 0)} paquets bons`} />
        <Indicateur
          libelle="Rendement"
          valeur={pct(ind?.ratioRendement)}
          detail={ind?.rendementReelPaquetsT ? `${nombre(ind.rendementReelPaquetsT)} paquets par tonne de papier` : "Plusieurs produits : moyenne pondérée"}
          ton={calcul?.alertes.some((a) => a.type === "rendement_faible") ? "danger" : "normal"}
        />
        <Indicateur libelle="Pertes" valeur={pct(ind?.tauxPerte)} ton={calcul?.alertes.some((a) => a.type === "perte_elevee") ? "danger" : "normal"} detail={`Pannes et arrêts imprévus : ${minutes(ind?.minutesArretNonPlanifie ?? 0)}`} />
        <Indicateur
          libelle="Efficacité des machines"
          valeur={pct(ind?.trs)}
          detail={ind?.trs === null ? "Vitesse de la machine à renseigner (Configuration → Cadences)" : `Temps de marche ${pct(ind?.disponibilite, 0)} · Vitesse ${pct(ind?.performance, 0)} · Paquets bons ${pct(ind?.qualite, 0)}`}
        />
      </div>
    </Carte>
  );
  const faites = { equipe: f.fiche_operateurs.length > 0, production: f.fiche_productions.length > 0, consommation: f.fiche_consommations.length > 0 };

  return (
    <>
      <TitrePage
        fil={[{ libelle: "Saisies de production", href: "/production/fiches" }]}
        titre={`${f.postes?.libelle} du ${formaterDate(f.date_production)}`}
        sousTitre={`${f.lignes_production?.libelle} · ${f.postes?.heure_debut.slice(0, 5)} – ${f.postes?.heure_fin.slice(0, 5)} · numéro de lot à écrire sur les colis : ${f.code_lot ?? "—"}`}
        action={<BarreEtapes etapes={[{ code: "brouillon", libelle: "En cours de saisie" }, { code: "validee", libelle: f.validee_le ? `Validée le ${formaterDateHeure(f.validee_le)}` : "Validée" }]} courante={modifiable ? "brouillon" : "validee"} />}
      />

      {modifiable ? (
        <p className="mb-4 rounded-2xl bg-papel-50 p-4 text-papel-900">
          Remplissez les étapes <strong>dans l&apos;ordre</strong>. Chaque ligne ajoutée est enregistrée tout de suite : vous pouvez fermer et revenir plus
          tard. À la fin, appuyez sur <strong>« Terminer et valider »</strong>.
        </p>
      ) : (
        <div className="mb-4">{resultats}</div>
      )}

      <div className="flex flex-col gap-4">
        <Etape numero={1} titre="Qui a travaillé ?" question="Cochez les personnes présentes pendant ce poste." faite={faites.equipe} modifiable={modifiable}>
          <FormulaireOperateurs
            ficheId={f.id}
            modifiable={modifiable}
            presents={f.fiche_operateurs.map((o) => o.operateur_id)}
            operateurs={(operateurs ?? []).map((o) => ({ id: o.id, libelle: `${o.prenom} ${o.nom}`, equipe: o.equipes?.libelle ?? "" }))}
          />
          {modifiable && <AjoutOperateur ficheId={f.id} equipeId={f.equipe_id} ouvert={!operateurs?.length} />}
        </Etape>

        <Etape numero={2} titre="Combien avez-vous produit ?" question="Comptez les colis fermés, puis les paquets qui restent hors colis. Pesez les déchets." faite={faites.production} modifiable={modifiable}>
          {f.fiche_productions.length > 0 && (
            <Tableau entetes={["Produit", "Production", "Déchets", "Coût réel", ""]}>
              {f.fiche_productions.map((l) => (
                <tr key={l.id}>
                  <Cellule>{l.conditionnements?.produits?.libelle} – {l.conditionnements?.libelle}</Cellule>
                  <Cellule className="font-semibold">{formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })}</Cellule>
                  <Cellule>{nombre(l.rebuts_kg, 1)} kg</Cellule>
                  <Cellule>{l.cout_unitaire_gnf === null ? "Calculé à la validation" : `${gnf(l.cout_unitaire_gnf)} / paquet`}</Cellule>
                  <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_productions" id={l.id} ficheId={f.id} />}</Cellule>
                </tr>
              ))}
            </Tableau>
          )}
          {modifiable && (
            <div className={f.fiche_productions.length ? "mt-3" : ""}>
              <FormulaireProduction
                ficheId={f.id}
                conditionnements={(conditionnements ?? [])
                  .filter((c) => c.produits?.actif)
                  .map((c) => ({ id: c.id, libelle: `${c.produits?.libelle} – ${c.libelle}`, paquetsParColis: c.paquets_par_colis }))
                  .sort((a, b) => a.libelle.localeCompare(b.libelle))}
              />
            </div>
          )}
        </Etape>

        <Etape numero={3} titre="Qu'avez-vous utilisé ?" question="Pour chaque bobine mise sur la machine : son numéro et le poids utilisé. Ajoutez aussi les emballages." faite={faites.consommation} modifiable={modifiable}>
          {f.fiche_consommations.length > 0 && (
            <Tableau entetes={["Article", "Bobine", "Quantité", ""]}>
              {f.fiche_consommations.map((c) => (
                <tr key={c.id}>
                  <Cellule>{c.articles?.libelle}</Cellule>
                  <Cellule className="font-mono">{c.lots?.numero_lot ?? "—"}</Cellule>
                  <Cellule className="font-semibold">
                    {nombre(c.quantite, 3)} {nomUnite(c.articles?.unite)}
                  </Cellule>
                  <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_consommations" id={c.id} ficheId={f.id} />}</Cellule>
                </tr>
              ))}
            </Tableau>
          )}
          {!modifiable && f.cout_matiere_gnf !== null && <p className="mt-2 text-gray-700">Coût des matières du poste : {gnf(f.cout_matiere_gnf)}</p>}
          {modifiable && (
            <div className={f.fiche_consommations.length ? "mt-3" : ""}>
              <FormulaireConsommation
                ficheId={f.id}
                articles={(articles ?? []).map((a) => ({ id: a.article_id!, libelle: a.libelle!, suiviParLot: !!a.suivi_par_lot, unite: a.unite! }))}
                lots={(lots ?? []).map((l) => ({ id: l.id!, articleId: l.article_id!, libelle: `${l.numero_lot} — reste ${nombre(l.poids_restant_kg, 1)} kg` }))}
              />
            </div>
          )}
        </Etape>

        <Etape numero={4} titre="La machine s'est-elle arrêtée ?" question="Pause, nettoyage, panne, manque de bobine… Si la machine n'a pas arrêté, passez à l'étape 5." faite={f.fiche_arrets.length > 0} facultative modifiable={modifiable}>
          {f.fiche_arrets.length > 0 && (
            <Tableau entetes={["Raison", "Prévu ?", "Durée", "Début", "Commentaire", ""]}>
              {f.fiche_arrets.map((a) => (
                <tr key={a.id}>
                  <Cellule>{a.causes_arret?.libelle}</Cellule>
                  <Cellule>{a.causes_arret?.type_arret === "planifie" ? <Badge ton="neutre">Prévu</Badge> : <Badge ton="alerte">Imprévu</Badge>}</Cellule>
                  <Cellule className="font-semibold">{minutes(a.duree_min)}</Cellule>
                  <Cellule>{a.heure_debut?.slice(0, 5) ?? "—"}</Cellule>
                  <Cellule className="text-sm">{a.commentaire}</Cellule>
                  <Cellule>{modifiable && <BoutonSupprimerLigne table="fiche_arrets" id={a.id} ficheId={f.id} />}</Cellule>
                </tr>
              ))}
            </Tableau>
          )}
          {modifiable && (
            <div className={f.fiche_arrets.length ? "mt-3" : ""}>
              <FormulaireArret ficheId={f.id} causes={(causes ?? []).map((c) => ({ id: c.id, libelle: `${c.libelle}${c.type_arret === "planifie" ? " (prévu)" : ""}` }))} />
            </div>
          )}
        </Etape>

        <Etape numero={5} titre={modifiable ? "Terminer" : "Équipe et remarques"} question={modifiable ? "Vérifiez, ajoutez une remarque si besoin, puis validez." : undefined} faite={!modifiable} modifiable={modifiable}>
          <FormulaireEnTete
            ficheId={f.id}
            modifiable={modifiable}
            equipes={equipes ?? []}
            ordres={(ordres ?? []).map((o) => ({ id: o.id!, libelle: `${o.numero} – ${o.produit_libelle} (${o.conditionnement_libelle})` }))}
            valeurs={{ equipe_id: f.equipe_id ?? "", of_id: f.of_id ?? "", notes: f.notes }}
          />
          {modifiable && (
            <div className="mt-4 flex flex-col gap-3">
              <BoutonValider ficheId={f.id} avertissements={avertissements} />
              <form action={supprimerFiche.bind(null, f.id)}>
                <Bouton type="submit" variante="discret">
                  Supprimer cette saisie (erreur)
                </Bouton>
              </form>
            </div>
          )}
        </Etape>

        {modifiable && resultats}
      </div>
    </>
  );
}
