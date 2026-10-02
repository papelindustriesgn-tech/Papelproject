import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { formaterDate, formaterDateHeure } from "@/lib/formulaires/dates";
import { STATUTS_REMISE } from "@/lib/logistique/libelles";
import { formaterStockProduitFini, type Paquets } from "@/lib/metier/unites";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireRemise } from "./formulaire";
import { ImagePreuve } from "./preuve";

export default async function PageRemise({ params }: PageProps<"/logistique/livraisons/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: b } = await supabase
    .from("livraisons")
    .select(
      "*, tournees_livraison(id, numero, statut), pieces_vente(numero, clients(nom, adresse, telephone, quartiers(nom))), lignes_livraison(id, paquets, paquets_retournes, conditionnements(libelle, paquets_par_colis, produits(libelle)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!b || b.statut !== "validee") notFound();
  const client = b.pieces_vente?.clients;
  const r = STATUTS_REMISE[b.statut_remise];
  const libelle = (l: (typeof b.lignes_livraison)[number]) => `${l.conditionnements?.produits?.libelle ?? ""} ${l.conditionnements?.libelle ?? ""}`.trim();
  const saisieOuverte = b.statut_remise === "a_livrer" && b.tournees_livraison?.statut === "en_cours";

  return (
    <>
      {b.tournees_livraison && (
        <Link href={`/logistique/tournees/${b.tournees_livraison.id}`} className="text-papel-700 underline">
          ← Tournée {b.tournees_livraison.numero}
        </Link>
      )}
      <TitrePage titre={`Livraison ${b.numero}`} sousTitre={`${client?.nom ?? ""} · commande ${b.pieces_vente?.numero ?? ""} · ${formaterDate(b.date_livraison)}`} action={<Badge ton={r.ton}>{r.libelle}</Badge>} />
      <div className="flex flex-col gap-4">
        <Carte titre="Client">
          <p className="font-semibold">{client?.nom}</p>
          <p>{[client?.adresse, client?.quartiers?.nom].filter(Boolean).join(", ") || "Adresse non renseignée"}</p>
          {client?.telephone && (
            <a href={`tel:${client.telephone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center font-semibold text-papel-700 underline">
              Appeler {client.telephone}
            </a>
          )}
        </Carte>
        <Carte titre="Contenu">
          <Tableau entetes={["Produit", "Quantité", "Rapporté"]}>
            {b.lignes_livraison.map((l) => (
              <tr key={l.id}>
                <Cellule>{libelle(l)}</Cellule>
                <Cellule>{formaterStockProduitFini(l.paquets as Paquets, { paquetsParColis: l.conditionnements?.paquets_par_colis ?? 1 })}</Cellule>
                <Cellule>{l.paquets_retournes > 0 ? `${l.paquets_retournes} paquets` : "—"}</Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
        {saisieOuverte ? (
          <Carte titre="Remise au client">
            <FormulaireRemise livraisonId={b.id} lignes={b.lignes_livraison.map((l) => ({ id: l.id, libelle: libelle(l), paquets: l.paquets }))} />
          </Carte>
        ) : b.statut_remise !== "a_livrer" ? (
          <Carte titre="Preuve de livraison">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-sm text-gray-600">Remis le</dt><dd>{b.remise_le ? formaterDateHeure(b.remise_le) : "—"}</dd></div>
              <div><dt className="text-sm text-gray-600">Réceptionné par</dt><dd>{b.receptionnaire || "—"}</dd></div>
              {b.commentaire_remise && <div className="sm:col-span-2"><dt className="text-sm text-gray-600">Commentaire</dt><dd>{b.commentaire_remise}</dd></div>}
              <div>
                <dt className="text-sm text-gray-600">Position</dt>
                <dd>
                  {b.latitude !== null && b.longitude !== null ? (
                    <a className="font-semibold text-papel-700 underline" href={`https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=17/${b.latitude}/${b.longitude}`} target="_blank" rel="noopener noreferrer">
                      Voir sur la carte (± {b.precision_m ?? "?"} m)
                    </a>
                  ) : "Non relevée"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-4">
              {b.signature_chemin && <ImagePreuve chemin={b.signature_chemin} alt="Signature du client" />}
              {b.photo_chemin && <ImagePreuve chemin={b.photo_chemin} alt="Photo de la livraison" />}
            </div>
          </Carte>
        ) : (
          <Carte>
            <p className="text-gray-700">La remise se saisit une fois la tournée partie.</p>
          </Carte>
        )}
      </div>
    </>
  );
}
