import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentsJoints } from "@/components/achats/documents";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { LIBELLES_STATUT_CONTENEUR, STATUTS_BC } from "@/lib/achats/libelles";
import { formaterDate } from "@/lib/formulaires/dates";
import { formaterMontant, usdCentimesVersGnf } from "@/lib/metier/devises";
import { formaterPoids, kg } from "@/lib/metier/unites";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { changerStatutBc, supprimerLigneBc } from "../../actions";
import { BoutonEnvoyerBc, FormulaireConteneur, FormulaireLigneBc } from "./formulaires";

export default async function PageBc({ params }: PageProps<"/achats/commandes/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: b }, { data: articles }] = await Promise.all([
    supabase.from("bons_commande").select("*, fournisseurs(nom, pays), lignes_bc(id, quantite, prix_unitaire, montant_devise, articles(libelle, unite)), conteneurs(id, reference, statut, poids_net_prevu_kg, date_livraison_prevue), demandes_achat(numero)").eq("id", id).maybeSingle(),
    supabase.from("articles").select("id, libelle, unite").eq("actif", true).neq("famille", "produit_fini").order("libelle"),
  ]);
  if (!b) notFound();
  const devise = b.devise as "GNF" | "USD";
  const total = b.lignes_bc.reduce((s, l) => s + l.montant_devise, 0);
  const brouillon = b.statut === "brouillon";

  return (
    <>
      <Link href="/achats/commandes" className="text-papel-700 underline">← Bons de commande</Link>
      <TitrePage
        titre={`Bon de commande ${b.numero ?? "(brouillon)"}`}
        sousTitre={`${b.fournisseurs?.nom} · ${formaterDate(b.date_commande)} · ${devise}${devise === "USD" && !brouillon ? ` · taux ${nombre(b.taux_change, 2)} GNF/USD` : ""}${b.incoterm ? ` · ${b.incoterm}` : ""}`}
        action={<Badge ton={STATUTS_BC[b.statut].ton}>{STATUTS_BC[b.statut].libelle}</Badge>}
      />
      {b.demandes_achat.length > 0 && <p className="mb-3 text-gray-700">Demandes : {b.demandes_achat.map((d) => d.numero).join(", ")}</p>}
      <div className="flex flex-col gap-4">
        <Carte titre="Lignes">
          <Tableau entetes={["Article", "Quantité", "Prix unitaire", "Montant", ""]}>
            {b.lignes_bc.map((l) => (
              <tr key={l.id}>
                <Cellule>{l.articles?.libelle}</Cellule>
                <Cellule>{l.articles?.unite === "kg" ? formaterPoids(kg(Number(l.quantite))) : `${nombre(l.quantite, 3)} ${l.articles?.unite}`}</Cellule>
                <Cellule>
                  {nombre(l.prix_unitaire, 4)} {devise} / {l.articles?.unite}
                  {l.articles?.unite === "kg" && <span className="block text-sm text-gray-600">soit {nombre(Number(l.prix_unitaire) * 1000, 2)} {devise} / t</span>}
                </Cellule>
                <Cellule className="font-semibold">{formaterMontant(l.montant_devise, devise)}</Cellule>
                <Cellule>
                  {brouillon && (
                    <form action={supprimerLigneBc.bind(null, l.id, b.id)}>
                      <button className="min-h-11 px-2 font-semibold text-red-700 underline">Retirer</button>
                    </form>
                  )}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          <p className="mt-3 text-right text-lg font-bold">
            Total : {formaterMontant(total, devise)}
            {devise === "USD" && !brouillon && <span className="block text-sm font-normal">≈ {gnf(usdCentimesVersGnf(total, Number(b.taux_change)))}</span>}
          </p>
          {b.frais_estimes_gnf > 0 && <p className="text-right text-sm text-gray-700">Frais d&apos;approche estimés : {gnf(b.frais_estimes_gnf)}</p>}
          {brouillon && (
            <div className="mt-3 flex flex-col gap-3">
              <FormulaireLigneBc bcId={b.id} devise={devise} articles={articles ?? []} />
              <BoutonEnvoyerBc bcId={b.id} />
            </div>
          )}
        </Carte>
        {!brouillon && (
          <Carte titre="Conteneurs / livraisons">
            <Tableau entetes={["Référence", "Poids déclaré", "Livraison prévue", "Statut"]}>
              {b.conteneurs.map((c) => (
                <tr key={c.id}>
                  <Cellule>
                    <Link href={`/achats/conteneurs/${c.id}`} className="font-mono font-semibold text-papel-800 underline">{c.reference}</Link>
                  </Cellule>
                  <Cellule>{formaterPoids(kg(Number(c.poids_net_prevu_kg)))}</Cellule>
                  <Cellule>{formaterDate(c.date_livraison_prevue)}</Cellule>
                  <Cellule>{LIBELLES_STATUT_CONTENEUR[c.statut]}</Cellule>
                </tr>
              ))}
            </Tableau>
            {b.statut === "envoye" && (
              <div className="mt-3 rounded-lg border border-gray-200 p-3">
                <FormulaireConteneur bcId={b.id} />
              </div>
            )}
          </Carte>
        )}
        <DocumentsJoints objetType="bon_commande" objetId={b.id} />
        {b.statut === "envoye" && (
          <div className="flex gap-2">
            <form action={changerStatutBc.bind(null, b.id, "recu")}>
              <Bouton type="submit" variante="secondaire">Marquer comme entièrement reçu</Bouton>
            </form>
            <form action={changerStatutBc.bind(null, b.id, "annule")}>
              <Bouton type="submit" variante="discret">Annuler la commande</Bouton>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
