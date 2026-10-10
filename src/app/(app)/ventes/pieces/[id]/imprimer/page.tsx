import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonImprimer } from "@/components/ui/bouton-imprimer";
import { formaterDate } from "@/lib/formulaires/dates";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { montantEnLettresGnf } from "@/lib/metier/ventes";
import { gnf, nombre } from "@/lib/stocks/libelles";
import { TYPES_PIECE } from "@/lib/ventes/libelles";
import { parametresVente } from "@/lib/ventes/parametres";
import { clientServeur } from "@/lib/supabase/serveur";

/** Document de vente imprimable (A4) : devis, commande, facture, avoir. */
export default async function ImprimerPiece({ params }: PageProps<"/ventes/pieces/[id]/imprimer">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: p }, { entreprise }] = await Promise.all([
    supabase
      .from("pieces_vente")
      .select("*, clients(nom, code, adresse, telephone, nif, quartiers(nom)), lignes_piece(id, paquets, prix_paquet_gnf, montant_ht_gnf, conditionnements(libelle, paquets_par_colis, produits(libelle)))")
      .eq("id", id)
      .maybeSingle(),
    parametresVente(),
  ]);
  if (!p || p.statut === "brouillon") notFound();
  const titre = TYPES_PIECE[p.type_piece].singulier.toUpperCase();

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-[15px] text-black print:max-w-none print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href={`/ventes/pieces/${p.id}`} className="text-papel-700 underline">
          ← Retour
        </Link>
        <BoutonImprimer />
      </div>
      <header className="imprimer-couleurs flex items-start justify-between gap-4 rounded bg-papel-700 p-4 text-white">
        <div>
          <Image src="/logo-papel.png" alt="Papel" width={120} height={68} />
          <div className="mt-2 text-sm">
            <div className="font-semibold">{entreprise.nom}</div>
            <div>{entreprise.adresse}</div>
            {entreprise.telephone && <div>Tél. : {entreprise.telephone}</div>}
            {entreprise.nif && <div>NIF : {entreprise.nif}</div>}
            {entreprise.rccm && <div>RCCM : {entreprise.rccm}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{titre}</div>
          <div className="font-mono text-lg">{p.numero}</div>
          <div className="text-sm">Date : {formaterDate(p.date_piece)}</div>
          {p.date_echeance && <div className="text-sm">Échéance : {formaterDate(p.date_echeance)}</div>}
        </div>
      </header>

      <section className="my-4 ml-auto w-72 rounded border border-gray-300 p-3">
        <div className="text-sm text-gray-600">Client</div>
        <div className="font-bold">{p.clients?.nom}</div>
        <div className="text-sm">Code : {p.clients?.code}</div>
        {p.clients?.adresse && <div className="text-sm">{p.clients.adresse}{p.clients.quartiers?.nom ? `, ${p.clients.quartiers.nom}` : ""}</div>}
        {p.clients?.telephone && <div className="text-sm">Tél. : {p.clients.telephone}</div>}
        {p.clients?.nif && <div className="text-sm">NIF : {p.clients.nif}</div>}
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2">Désignation</th>
            <th className="py-2">Quantité</th>
            <th className="py-2 text-right">Prix HT / paquet</th>
            <th className="py-2 text-right">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          {p.lignes_piece.map((l) => (
            <tr key={l.id} className="border-b border-gray-300">
              <td className="py-2">
                Mouchoirs {l.conditionnements?.produits?.libelle} – {l.conditionnements?.libelle}
              </td>
              <td className="py-2">{formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })}</td>
              <td className="py-2 text-right">{gnf(l.prix_paquet_gnf)}</td>
              <td className="py-2 text-right">{gnf(l.montant_ht_gnf)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto grid w-72 grid-cols-2 gap-1 text-right">
        <dt>Total HT</dt>
        <dd>{gnf(p.total_ht_gnf)}</dd>
        <dt>TVA {nombre(Number(p.tva_taux) * 100, 2)} %</dt>
        <dd>{gnf(p.total_tva_gnf)}</dd>
        <dt className="border-t border-black pt-1 font-bold">Total TTC</dt>
        <dd className="border-t border-black pt-1 font-bold">{gnf(p.total_ttc_gnf)}</dd>
      </dl>
      <p className="mt-4">
        {p.type_piece === "devis" ? "Devis arrêté" : p.type_piece === "avoir" ? "Avoir arrêté" : "Arrêté"} à la somme de : <strong>{montantEnLettresGnf(p.total_ttc_gnf)}</strong>.
      </p>
      {p.notes && <p className="mt-2">{p.notes}</p>}
      <footer className="mt-12 grid grid-cols-2 gap-8 text-sm">
        <div>
          Signature du client
          <div className="mt-12 border-t border-gray-400" />
        </div>
        <div>
          Pour {entreprise.nom}
          <div className="mt-12 border-t border-gray-400" />
        </div>
      </footer>
    </div>
  );
}
