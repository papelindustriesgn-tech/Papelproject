import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { formaterDate } from "@/lib/formulaires/dates";
import { gnf } from "@/lib/stocks/libelles";
import { STATUTS_PIECE, TYPES_PIECE } from "@/lib/ventes/libelles";
import { optionsClient } from "@/lib/ventes/options";
import { clientServeur } from "@/lib/supabase/serveur";
import { basculerClient } from "../../actions";
import { FormulaireClient } from "../formulaire";

export default async function FicheClient({ params }: PageProps<"/ventes/clients/[id]">) {
  const { id } = await params;
  const supabase = await clientServeur();
  const [{ data: c }, { data: solde }, { data: pieces }, options] = await Promise.all([
    supabase.from("clients").select("*, types_clients(libelle, dotation)").eq("id", id).maybeSingle(),
    supabase.from("soldes_clients").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("pieces_vente").select("id, type_piece, numero, date_piece, statut, total_ttc_gnf").eq("client_id", id).order("date_piece", { ascending: false }).limit(50),
    optionsClient(),
  ]);
  if (!c) notFound();
  const depassement = c.condition_paiement === "credit" && c.plafond_credit_gnf > 0 && (solde?.encours_gnf ?? 0) > c.plafond_credit_gnf * 0.9;

  return (
    <>
      <Link href="/ventes/clients" className="text-papel-700 underline">
        ← Clients
      </Link>
      <TitrePage
        titre={c.nom}
        sousTitre={`${c.code} · ${c.types_clients?.libelle}${c.types_clients?.dotation ? " · reçoit la dotation" : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!c.actif && <Badge ton="neutre">Archivé</Badge>}
            <Link href={`/ventes/pieces/nouvelle?client=${c.id}&type=devis`} className="min-h-11 content-center rounded-lg border border-papel-300 bg-white px-3 font-semibold text-papel-800">
              + Devis
            </Link>
            <Link href={`/ventes/pieces/nouvelle?client=${c.id}&type=commande`} className="min-h-11 content-center rounded-lg bg-papel-700 px-3 font-semibold text-white">
              + Commande
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Encours (reste à payer)" valeur={gnf(solde?.encours_gnf ?? 0)} ton={depassement ? "alerte" : "normal"} detail={c.condition_paiement === "credit" ? `Plafond : ${c.plafond_credit_gnf ? gnf(c.plafond_credit_gnf) : "aucun"} · ${c.delai_paiement_jours} j` : "Paiement comptant"} />
        <Indicateur libelle="Échu (en retard)" valeur={gnf(solde?.echu_gnf ?? 0)} ton={(solde?.echu_gnf ?? 0) > 0 ? "danger" : "normal"} detail={solde?.retard_max_jours ? `Retard maximum : ${solde.retard_max_jours} j` : undefined} />
        <Indicateur libelle="Pièces" valeur={pieces?.length ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Fiche client">
          <FormulaireClient
            id={c.id}
            {...options}
            initial={{
              nom: c.nom,
              type_client_id: c.type_client_id,
              responsable: c.responsable,
              telephone: c.telephone,
              adresse: c.adresse,
              quartier_id: c.quartier_id ?? "",
              nif: c.nif,
              condition_paiement: c.condition_paiement,
              delai_paiement_jours: String(c.delai_paiement_jours),
              plafond_credit_gnf: String(c.plafond_credit_gnf),
              commercial_id: c.commercial_id ?? "",
              notes: c.notes,
            }}
          />
          <form action={basculerClient.bind(null, c.id, !c.actif)} className="mt-3">
            <Bouton type="submit" variante="discret">
              {c.actif ? "Archiver le client" : "Réactiver le client"}
            </Bouton>
          </form>
        </Carte>
        <Carte titre="Historique">
          <Tableau entetes={["Pièce", "Date", "Montant TTC", "Statut"]}>
            {(pieces ?? []).map((p) => (
              <tr key={p.id}>
                <Cellule>
                  <Link href={`/ventes/pieces/${p.id}`} className="font-semibold text-papel-800 underline">
                    {TYPES_PIECE[p.type_piece].singulier} {p.numero ?? "(brouillon)"}
                  </Link>
                </Cellule>
                <Cellule>{formaterDate(p.date_piece)}</Cellule>
                <Cellule>{gnf(p.total_ttc_gnf)}</Cellule>
                <Cellule>
                  <Badge ton={STATUTS_PIECE[p.statut].ton}>{STATUTS_PIECE[p.statut].libelle}</Badge>
                </Cellule>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>
    </>
  );
}
