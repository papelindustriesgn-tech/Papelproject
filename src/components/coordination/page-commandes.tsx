import { CheckCircle2, Clock, Factory, PackageCheck } from "lucide-react";
import Link from "next/link";
import { Badge, Carte, Cellule, classesBouton, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { chargerCoordination, type CommandeAServir } from "@/lib/coordination/charger";
import { formaterDate, formaterDateHeure, ilYA } from "@/lib/formulaires/dates";
import type { EtatCommande, SourceEstimation } from "@/lib/metier/coordination";
import { nombre } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";

const ETATS: Record<EtatCommande, { libelle: string; ton: "succes" | "alerte" | "erreur" }> = {
  en_stock: { libelle: "Prête en stock", ton: "succes" },
  partielle: { libelle: "En partie en stock", ton: "alerte" },
  a_produire: { libelle: "À produire", ton: "erreur" },
};

const SOURCES: Record<SourceEstimation, string> = {
  stock: "en stock",
  rythme: "au rythme actuel de production",
  ordre: "date de fin de l'ordre de fabrication",
  cadence: "cadence théorique de la ligne (estimation)",
  inconnue: "à planifier par la production",
};

/** « 12 colis + 30 paquets » (le colis dépend du conditionnement). */
export function enColis(paquets: number, paquetsParColis: number): string {
  const c = Math.floor(paquets / paquetsParColis);
  const r = paquets - c * paquetsParColis;
  return [c ? `${nombre(c)} colis` : "", r ? `${nombre(r)} paquet${r > 1 ? "s" : ""}` : ""].filter(Boolean).join(" + ") || "0";
}

const LIBELLES_ESPACES: Record<string, string> = {
  magasin: "Stocks",
  production: "Production",
  ventes: "Ventes",
  logistique: "Logistique",
  commercial: "Équipe commerciale",
};

const PHRASES: Record<string, string> = {
  magasin: "Commandes des clients pas encore livrées : préparez ce qui est en stock, signalez le reste à la production.",
  production: "Ce que les clients attendent : lancez les ordres de fabrication pour ce qui manque en stock.",
  ventes: "Où en sont les commandes des clients : stock disponible et date de livraison estimée.",
  logistique: "Commandes à livrer prochainement : préparez les tournées selon les dates estimées.",
  commercial: "Commandes de vos commerciaux : date de livraison estimée et confirmation des livraisons.",
};

/**
 * Écran « Commandes clients » partagé par les Stocks, la Production, les Ventes, la Logistique et l'Équipe commerciale :
 * une même vue des commandes à servir, du stock réservé, de ce qu'il faut produire et de la date de livraison estimée.
 */
export async function PageCommandes({ espace }: { espace: string }) {
  const c = await chargerCoordination();
  const libelle = LIBELLES_ESPACES[espace] ?? "";
  if (!c)
    return (
      <>
        <TitrePage titre="Commandes clients" fil={[{ libelle, href: `/${espace}` }]} />
        <Carte>
          <p className="text-gray-600">Vous n&apos;avez pas accès aux commandes clients.</p>
        </Carte>
      </>
    );
  const prets = c.commandes.filter((x) => x.etat === "en_stock").length;
  const colisAProduire = c.besoins.reduce((s, b) => s + Math.ceil(b.paquetsAProduire / b.paquetsParColis), 0);
  const lienPiece = espace === "ventes";

  return (
    <>
      <TitrePage titre="Commandes clients" sousTitre={PHRASES[espace]} fil={[{ libelle, href: `/${espace}` }]} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur libelle="Commandes à servir" valeur={nombre(c.commandes.length)} detail="Validées, pas encore entièrement livrées" />
        <Indicateur libelle="Prêtes en stock" valeur={nombre(prets)} detail="Tout est disponible à l'usine" />
        <Indicateur libelle="À produire" valeur={nombre(c.commandes.length - prets)} ton={c.commandes.length - prets > 0 ? "alerte" : "normal"} detail="Stock insuffisant pour au moins un produit" />
        <Indicateur libelle="Colis à produire" valeur={nombre(colisAProduire)} ton={colisAProduire > 0 ? "alerte" : "normal"} detail="Pour couvrir toutes les commandes" />
      </div>

      {c.besoins.length > 0 && (
        <Carte
          titre={
            <span className="flex items-center gap-2">
              <Factory size={18} className="text-papel-700" aria-hidden /> À produire pour les commandes
            </span>
          }
          className="mb-4"
        >
          <Tableau entetes={["Produit", "Manque", "Stock actuel", "Commandes", "Attendu depuis", ""]}>
            {c.besoins.map((b) => (
              <tr key={b.conditionnementId}>
                <Cellule data-label="Produit" className="font-semibold">
                  {b.produit} – {b.conditionnement}
                </Cellule>
                <Cellule data-label="Manque">{enColis(b.paquetsAProduire, b.paquetsParColis)}</Cellule>
                <Cellule data-label="Stock actuel">{enColis(b.stock, b.paquetsParColis)}</Cellule>
                <Cellule data-label="Commandes">{nombre(b.commandes)}</Cellule>
                <Cellule data-label="Attendu depuis">{formaterDate(b.depuis)}</Cellule>
                <Cellule data-label="">
                  {espace === "production" ? (
                    <Link
                      className={classesBouton("principal", "min-h-10 px-3 text-sm")}
                      href={`/production/ordres?conditionnement=${b.conditionnementId}&colis=${Math.ceil(b.paquetsAProduire / b.paquetsParColis)}&note=${encodeURIComponent("Pour les commandes clients")}#nouvel-ordre`}
                    >
                      Lancer un ordre de fabrication
                    </Link>
                  ) : null}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          <p className="mt-2 text-sm text-gray-600">
            Les commandes sont servies dans l&apos;ordre d&apos;arrivée. Délai estimé : rythme de production des {c.joursReference} derniers jours, sinon ordres de fabrication en cours,
            sinon cadence théorique ; livraison {c.delaiLivraisonJours} jour(s) après la disponibilité à l&apos;usine.
          </p>
        </Carte>
      )}

      <Carte titre="Commandes à servir">
        {c.commandes.length ? (
          <ul className="divide-y divide-gray-100">
            {c.commandes.map((x) => (
              <LigneCommande key={x.id} commande={x} lien={lienPiece ? `/ventes/pieces/${x.id}` : undefined} />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 py-3 font-semibold text-green-800">
            <CheckCircle2 size={20} aria-hidden /> Aucune commande en attente : tout est livré.
          </p>
        )}
      </Carte>

      {["ventes", "commercial", "logistique"].includes(espace) && <LivraisonsRecentes />}
    </>
  );
}

function LigneCommande({ commande: x, lien }: { commande: CommandeAServir; lien?: string }) {
  const e = ETATS[x.etat];
  const titre = (
    <span className="font-bold text-gray-900">
      {x.numero} · {x.clientNom}
    </span>
  );
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {lien ? (
            <Link href={lien} className="hover:underline">
              {titre}
            </Link>
          ) : (
            titre
          )}
          <p className="text-sm text-gray-600">
            Commandée le {formaterDate(x.datePiece)}
            {x.commercialNom ? ` · ${x.commercialNom}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge ton={e.ton}>{e.libelle}</Badge>
          <span className="flex items-center gap-1 rounded-lg bg-papel-50 px-2 py-1 text-sm font-semibold text-papel-800">
            <Clock size={14} aria-hidden /> Livraison estimée : {x.dateLivraison ? formaterDate(x.dateLivraison) : "à planifier"}
          </span>
        </div>
      </div>
      <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {x.lignes.map((l) => (
          <li key={l.ligne.conditionnementId} className="rounded-xl bg-gray-50 px-3 py-2">
            <span className="font-semibold text-gray-900">
              {l.ligne.produit} – {l.ligne.conditionnement}
            </span>{" "}
            : {enColis(l.ligne.paquetsRestants, l.ligne.paquetsParColis)} à livrer
            <span className="block text-gray-600">
              {l.paquetsAProduire === 0
                ? "Disponible en stock"
                : `${l.paquetsEnStock ? `${enColis(l.paquetsEnStock, l.ligne.paquetsParColis)} en stock, ` : ""}${enColis(l.paquetsAProduire, l.ligne.paquetsParColis)} à produire`}
              {l.paquetsAProduire > 0 && ` · ${l.datePrete ? `prêt le ${formaterDate(l.datePrete)}` : "date à fixer"} (${SOURCES[l.source]}${l.ordre ? ` ${l.ordre}` : ""})`}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Livraisons remises ces 30 derniers jours et leur confirmation par le commercial (boucle fermée). */
async function LivraisonsRecentes() {
  const supabase = await clientServeur();
  const depuis = `${ilYA(30)}T00:00:00Z`;
  const { data } = await supabase
    .from("livraisons")
    .select("id, numero, statut_remise, remise_le, receptionnaire, confirmation, confirmee_le, confirmation_note, pieces_vente!livraisons_commande_id_fkey(numero, clients(nom))")
    .neq("statut_remise", "a_livrer")
    .gte("remise_le", depuis)
    .order("remise_le", { ascending: false })
    .limit(100);
  const liste = data ?? [];
  const REMISES: Record<string, string> = { livree: "Livrée", partielle: "Livrée en partie", refusee: "Refusée" };
  return (
    <Carte
      titre={
        <span className="flex items-center gap-2">
          <PackageCheck size={18} className="text-papel-700" aria-hidden /> Livraisons remises et confirmation du commercial
        </span>
      }
      className="mt-4"
    >
      {liste.length ? (
        <Tableau entetes={["Bon", "Client", "Remise", "Confirmation du commercial"]}>
          {liste.map((l) => (
            <tr key={l.id}>
              <Cellule data-label="Bon" className="font-semibold">
                {l.numero} <span className="block text-xs font-normal text-gray-500">Commande {l.pieces_vente?.numero}</span>
              </Cellule>
              <Cellule data-label="Client">{l.pieces_vente?.clients?.nom}</Cellule>
              <Cellule data-label="Remise">
                {REMISES[l.statut_remise] ?? l.statut_remise}
                {l.remise_le && <span className="block text-xs text-gray-500">{formaterDateHeure(l.remise_le)}{l.receptionnaire ? ` · ${l.receptionnaire}` : ""}</span>}
              </Cellule>
              <Cellule data-label="Confirmation du commercial">
                {l.confirmation === "conforme" ? (
                  <Badge ton="succes">Confirmée</Badge>
                ) : l.confirmation === "probleme" ? (
                  <>
                    <Badge ton="erreur">Problème signalé</Badge>
                    <span className="mt-1 block text-sm text-gray-700">{l.confirmation_note}</span>
                  </>
                ) : (
                  <Badge ton="alerte">En attente</Badge>
                )}
              </Cellule>
            </tr>
          ))}
        </Tableau>
      ) : (
        <p className="text-gray-600">Aucune livraison remise ces 30 derniers jours.</p>
      )}
    </Carte>
  );
}
