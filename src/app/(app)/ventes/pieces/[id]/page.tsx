import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BarreEtapes, Bouton, Carte, Cellule, classesBouton, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui, formaterDate } from "@/lib/formulaires/dates";
import { calculerTotaux } from "@/lib/metier/tva";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { CANAUX_RELANCE, TYPES_PIECE } from "@/lib/ventes/libelles";
import { parametresVente } from "@/lib/ventes/parametres";
import { clientServeur } from "@/lib/supabase/serveur";
import { annulerPiece, preparerLivraison, supprimerBrouillon, supprimerLigne, transformerPiece } from "../../actions";
import { BoutonValiderPiece, FormulaireDotation, FormulaireLigne, FormulairePaiement, FormulaireQuantite, FormulaireRelance } from "./formulaires";

export default async function PagePiece({ params }: PageProps<"/ventes/pieces/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: p } = await supabase
    .from("pieces_vente")
    .select(
      `*, clients(id, nom, code, condition_paiement, types_clients(libelle, dotation)),
       lignes_piece(id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf, conditionnements(libelle, paquets_par_colis, produits(libelle)))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const def = TYPES_PIECE[p.type_piece];
  const brouillon = p.statut === "brouillon";

  const [{ data: origine }, { data: derivees }, { data: conditionnements }, parametres] = await Promise.all([
    p.origine_id ? supabase.from("pieces_vente").select("id, type_piece, numero").eq("id", p.origine_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("pieces_vente").select("id, type_piece, numero, statut").eq("origine_id", p.id),
    supabase.from("conditionnements").select("id, libelle, paquets_par_colis, par_defaut, produit_id, produits(libelle, actif)").eq("actif", true),
    parametresVente(),
  ]);
  const listeConditionnements = (conditionnements ?? [])
    .filter((c) => c.produits?.actif)
    // Tri : produit, puis colis par défaut en premier, puis taille de colis croissante.
    .sort((a, b) => (a.produits?.libelle ?? "").localeCompare(b.produits?.libelle ?? "") || Number(b.par_defaut) - Number(a.par_defaut) || a.paquets_par_colis - b.paquets_par_colis)
    .map((c) => ({ id: c.id, libelle: `${c.produits?.libelle} – ${c.libelle}`, paquetsParColis: c.paquets_par_colis, produitId: c.produit_id }));

  // Totaux : figés à la validation ; aperçu calculé pour un brouillon.
  const totalHt = p.lignes_piece.reduce((s, l) => s + l.montant_ht_gnf, 0);
  const totaux = brouillon ? calculerTotaux(totalHt, parametres.tva) : { totalHtGnf: p.total_ht_gnf, tvaGnf: p.total_tva_gnf, totalTtcGnf: p.total_ttc_gnf };
  const tauxTva = brouillon ? (parametres.tva.applicable ? parametres.tva.taux : 0) : Number(p.tva_taux);

  // Données spécifiques aux commandes et factures.
  const estCommande = p.type_piece === "commande" && p.statut === "valide";
  const estFacture = p.type_piece === "facture" && p.statut === "valide";
  const [{ data: livraisons }, { data: reste }, { data: etat }, { data: paiements }, { data: modes }, { data: dotations }, { data: relances }] = await Promise.all([
    estCommande ? supabase.from("livraisons").select("id, numero, date_livraison, statut").eq("commande_id", p.id).order("created_at") : Promise.resolve({ data: [] }),
    estCommande ? supabase.from("reste_a_livrer").select("conditionnement_id, paquets_restants").eq("commande_id", p.id) : Promise.resolve({ data: [] }),
    estFacture ? supabase.from("factures_etat").select("*").eq("id", p.id).maybeSingle() : Promise.resolve({ data: null }),
    estFacture ? supabase.from("paiements").select("id, date_paiement, montant_gnf, reference, modes_paiement(libelle)").eq("facture_id", p.id).order("date_paiement") : Promise.resolve({ data: [] }),
    estFacture ? supabase.from("modes_paiement").select("id, libelle").eq("actif", true).order("ordre") : Promise.resolve({ data: [] }),
    estFacture ? supabase.from("dotations").select("id, produit_id, paquets_dus, paquets_remis, produits(libelle)").eq("facture_id", p.id) : Promise.resolve({ data: [] }),
    estFacture ? supabase.from("relances").select("id, date_relance, canal, note, promesse_date").eq("facture_id", p.id).order("date_relance", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  // Barre d'étapes du document (à la Odoo).
  const etapes = [
    { code: "brouillon", libelle: "Brouillon" },
    { code: "valide", libelle: p.type_piece === "facture" ? "Validée" : "Validé" },
    ...(p.type_piece === "facture" ? [{ code: "payee", libelle: "Payée" }] : []),
    ...(p.statut === "annule" ? [{ code: "annule", libelle: "Annulé" }] : []),
  ];
  const etapeCourante = estFacture && Number(etat?.solde_gnf ?? 1) <= 0 ? "payee" : p.statut;
  const resteALivrer = (reste ?? []).reduce((s, r) => s + Number(r.paquets_restants ?? 0), 0);
  const factureExiste = (derivees ?? []).some((d) => d.type_piece === "facture" && d.statut !== "annule");
  const commandeExiste = (derivees ?? []).some((d) => d.type_piece === "commande" && d.statut !== "annule");
  const solde = Number(etat?.solde_gnf ?? 0);

  return (
    <>
      <TitrePage
        fil={[{ libelle: def.pluriel, href: `/ventes/pieces?type=${p.type_piece}` }]}
        titre={p.numero ?? `${def.singulier} (brouillon)`}
        sousTitre={`${p.clients?.nom} · ${p.clients?.types_clients?.libelle} · du ${formaterDate(p.date_piece)}${p.date_echeance ? ` · échéance ${formaterDate(p.date_echeance)}` : ""}`}
        action={
          !brouillon && (
            <Link href={`/ventes/pieces/${p.id}/imprimer`} className={classesBouton("secondaire")}>
              Imprimer / PDF
            </Link>
          )
        }
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[1.1rem] font-semibold text-gray-900">
          {def.singulier} · {p.clients?.nom}
        </span>
        <BarreEtapes etapes={etapes} courante={etapeCourante} />
      </div>
      {(origine || (derivees ?? []).length > 0) && (
        <p className="mb-3 text-gray-700">
          {origine && (
            <>
              Issu de :{" "}
              <Link href={`/ventes/pieces/${origine.id}`} className="font-semibold text-papel-700 underline">
                {TYPES_PIECE[origine.type_piece].singulier} {origine.numero}
              </Link>
              .{" "}
            </>
          )}
          {(derivees ?? []).map((d) => (
            <span key={d.id} className="mr-2">
              →{" "}
              <Link href={`/ventes/pieces/${d.id}`} className="font-semibold text-papel-700 underline">
                {TYPES_PIECE[d.type_piece].singulier} {d.numero ?? "(brouillon)"}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Carte titre="Produits">
          <Tableau entetes={["Produit", "Quantité", "Prix HT / paquet", "Montant HT", ""]}>
            {p.lignes_piece.map((l) => (
              <tr key={l.id}>
                <Cellule>
                  {l.conditionnements?.produits?.libelle} – {l.conditionnements?.libelle}
                </Cellule>
                <Cellule>
                  {brouillon ? (
                    <FormulaireQuantite ligneId={l.id} pieceId={p.id} colis={l.quantite_colis} vrac={l.paquets_vrac} />
                  ) : (
                    formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })
                  )}
                </Cellule>
                <Cellule>{gnf(l.prix_paquet_gnf)}</Cellule>
                <Cellule className="font-semibold">{gnf(l.montant_ht_gnf)}</Cellule>
                <Cellule>
                  {brouillon && (
                    <form action={supprimerLigne.bind(null, l.id, p.id)}>
                      <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                    </form>
                  )}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          {brouillon && p.type_piece !== "avoir" && (
            <div className="mt-3">
              <FormulaireLigne pieceId={p.id} conditionnements={listeConditionnements} />
            </div>
          )}
          <dl className="mt-4 ml-auto grid max-w-sm grid-cols-2 gap-1 text-right">
            <dt>Total HT</dt>
            <dd className="font-semibold">{gnf(totaux.totalHtGnf)}</dd>
            <dt>TVA ({nombre(tauxTva * 100, 2)} %)</dt>
            <dd className="font-semibold">{gnf(totaux.tvaGnf)}</dd>
            <dt className="text-lg font-bold">Total TTC</dt>
            <dd className="text-lg font-bold">{gnf(totaux.totalTtcGnf)}</dd>
          </dl>
          {totaux.totalTtcGnf > 0 && <p className="mt-2 text-right text-sm text-gray-700">{montantEnLettresGnf(totaux.totalTtcGnf)}</p>}
          {p.notes && <p className="mt-2 text-gray-700">Notes : {p.notes}</p>}
        </Carte>

        {brouillon && (
          <Carte titre="Validation">
            <p className="mb-2 text-gray-700">
              La validation attribue le numéro définitif{p.type_piece === "facture" ? ", calcule la TVA et contrôle le plafond de crédit du client" : ""}
              {p.type_piece === "avoir" ? " et remet les paquets repris en stock" : ""}. Elle est définitive.
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <BoutonValiderPiece pieceId={p.id} typePiece={p.type_piece} libelle={{ devis: "Valider le devis", commande: "Valider la commande", facture: "Valider la facture", avoir: "Valider l'avoir" }[p.type_piece]} />
              <form action={supprimerBrouillon.bind(null, p.id)}>
                <Bouton type="submit" variante="discret">
                  Supprimer le brouillon
                </Bouton>
              </form>
            </div>
          </Carte>
        )}

        {p.type_piece === "devis" && p.statut === "valide" && (
          <Carte titre="Suite du devis">
            <div className="flex flex-wrap gap-2">
              {!commandeExiste && !factureExiste && (
                <>
                  <form action={transformerPiece.bind(null, p.id, "commande")}>
                    <Bouton type="submit">Le client accepte : créer la commande</Bouton>
                  </form>
                  <form action={transformerPiece.bind(null, p.id, "facture")}>
                    <Bouton type="submit" variante="secondaire">
                      Facturer directement
                    </Bouton>
                  </form>
                  <form action={annulerPiece.bind(null, p.id)}>
                    <Bouton type="submit" variante="discret">
                      Refusé / annuler
                    </Bouton>
                  </form>
                </>
              )}
            </div>
          </Carte>
        )}

        {estCommande && (
          <Carte titre="Livraison et facturation">
            <Tableau entetes={["Bon de livraison", "Date", "Statut"]}>
              {(livraisons ?? []).map((l) => (
                <tr key={l.id}>
                  <Cellule>
                    <Link href={`/ventes/livraisons/${l.id}`} className="font-mono font-semibold text-papel-700 hover:underline">
                      {l.numero ?? "Brouillon"}
                    </Link>
                  </Cellule>
                  <Cellule>{formaterDate(l.date_livraison)}</Cellule>
                  <Cellule>{l.statut === "validee" ? <Badge ton="succes">Livrée</Badge> : <Badge ton="alerte">À valider</Badge>}</Cellule>
                </tr>
              ))}
            </Tableau>
            <p className="my-2 text-gray-700">{resteALivrer > 0 ? `Reste à livrer : ${nombre(resteALivrer)} paquets.` : "Commande entièrement livrée."}</p>
            <div className="flex flex-wrap gap-2">
              {resteALivrer > 0 && !(livraisons ?? []).some((l) => l.statut === "brouillon") && (
                <form action={preparerLivraison.bind(null, p.id)}>
                  <Bouton type="submit">Préparer le bon de livraison</Bouton>
                </form>
              )}
              {!factureExiste && (
                <form action={transformerPiece.bind(null, p.id, "facture")}>
                  <Bouton type="submit" variante="secondaire">
                    Créer la facture
                  </Bouton>
                </form>
              )}
              {!(livraisons ?? []).some((l) => l.statut === "validee") && (
                <form action={annulerPiece.bind(null, p.id)}>
                  <Bouton type="submit" variante="discret">
                    Annuler la commande
                  </Bouton>
                </form>
              )}
            </div>
          </Carte>
        )}

        {estFacture && (
          <>
            <Carte titre={`Paiements — reste à payer : ${gnf(solde)}`}>
              <Tableau entetes={["Date", "Mode", "Référence", "Montant"]}>
                {(paiements ?? []).map((pa) => (
                  <tr key={pa.id}>
                    <Cellule>{formaterDate(pa.date_paiement)}</Cellule>
                    <Cellule>{pa.modes_paiement?.libelle}</Cellule>
                    <Cellule>{pa.reference}</Cellule>
                    <Cellule className="font-semibold">{gnf(pa.montant_gnf)}</Cellule>
                  </tr>
                ))}
              </Tableau>
              {Number(etat?.avoirs_gnf ?? 0) > 0 && <p className="mt-2 text-gray-700">Avoirs déduits : {gnf(etat?.avoirs_gnf)}</p>}
              {solde > 0 ? (
                <div className="mt-3">
                  <FormulairePaiement factureId={p.id} modes={modes ?? []} reste={solde} dateDuJour={aujourdhui()} />
                </div>
              ) : (
                <p className="mt-2">
                  <Badge ton="succes">Facture soldée</Badge>
                </p>
              )}
            </Carte>

            {p.clients?.types_clients?.dotation && (
              <Carte titre={`Dotation (${nombre(parametres.tauxDotation * 100, 1)} paquets offerts pour 100, sur l'encaissé)`}>
                {(dotations ?? []).length ? (
                  <ul className="divide-y divide-gray-100">
                    {(dotations ?? []).map((d) => {
                      const resteDot = d.paquets_dus - d.paquets_remis;
                      return (
                        <li key={d.id} className="py-3">
                          <div className="font-semibold">
                            {d.produits?.libelle} : {nombre(d.paquets_dus)} paquets dus, {nombre(d.paquets_remis)} remis
                          </div>
                          {resteDot > 0 && (
                            <div className="mt-2">
                              <FormulaireDotation dotationId={d.id} reste={resteDot} conditionnements={listeConditionnements.filter((c) => c.produitId === d.produit_id)} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-700">La dotation apparaîtra au premier paiement.</p>
                )}
              </Carte>
            )}

            {solde > 0 && (
              <Carte titre="Relances">
                <Tableau entetes={["Date", "Canal", "Compte rendu", "Promesse"]}>
                  {(relances ?? []).map((r) => (
                    <tr key={r.id}>
                      <Cellule>{formaterDate(r.date_relance)}</Cellule>
                      <Cellule>{CANAUX_RELANCE[r.canal]}</Cellule>
                      <Cellule>{r.note}</Cellule>
                      <Cellule>{r.promesse_date ? formaterDate(r.promesse_date) : "—"}</Cellule>
                    </tr>
                  ))}
                </Tableau>
                <div className="mt-3">
                  <FormulaireRelance factureId={p.id} />
                </div>
              </Carte>
            )}

            <Carte titre="Retour de marchandise / erreur de facturation">
              <p className="mb-2 text-gray-700">Une facture validée ne se modifie pas : établissez un avoir (les paquets repris reviennent en stock).</p>
              <form action={transformerPiece.bind(null, p.id, "avoir")}>
                <Bouton type="submit" variante="secondaire">
                  Créer un avoir
                </Bouton>
              </form>
            </Carte>
          </>
        )}
      </div>
    </>
  );
}
