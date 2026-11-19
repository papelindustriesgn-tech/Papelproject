import { CheckCircle2, Clock, Factory, PackageCheck } from "lucide-react";
import Link from "next/link";
import { ConfirmerDate } from "@/components/commandes/confirmer-date";
import { Badge, Bouton, Carte, Cellule, classesBouton, Tableau, TitrePage } from "@/components/ui";
import { Indicateur } from "@/components/ui/indicateur";
import { chargerCoordination, type CommandeAServir } from "@/lib/coordination/charger";
import { formaterDate, formaterDateHeure, ilYA } from "@/lib/formulaires/dates";
import { preparerCommande } from "@/lib/livraisons/actions";
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
  reception: "produit acheté : attend une réception de marchandise",
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
  magasin: "Commandes des clients à préparer : préparez les colis de ce qui est en stock, le reste attend la production ou l'arrivée de marchandise.",
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
  const supabase = await clientServeur();
  const ids = c.commandes.map((x) => x.id);
  const [{ data: suivis }, { data: preparations }] = await Promise.all([
    ids.length ? supabase.from("suivi_commandes").select("commande_id, date_souhaitee, date_confirmee").in("commande_id", ids) : Promise.resolve({ data: [] }),
    ids.length && ["magasin", "ventes"].includes(espace) ? supabase.from("livraisons").select("id, commande_id").eq("statut", "brouillon").in("commande_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const suiviDe = new Map((suivis ?? []).map((x) => [x.commande_id, x]));
  const enPreparation = new Set((preparations ?? []).map((x) => x.commande_id));
  const prets = c.commandes.filter((x) => x.etat === "en_stock").length;
  const colisAProduire = c.besoins.reduce((s, b) => s + Math.ceil(b.paquetsAProduire / b.paquetsParColis), 0);
  const lienPiece = espace === "ventes";

  return (
    <>
      <TitrePage titre="Commandes clients" sousTitre={PHRASES[espace]} fil={[{ libelle, href: `/${espace}` }]} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur libelle="Commandes à servir" valeur={nombre(c.commandes.length)} detail="Validées, pas encore entièrement livrées" />
        <Indicateur libelle="Prêtes en stock" valeur={nombre(prets)} detail="Tout est disponible à l'usine" />
        <Indicateur libelle="Stock insuffisant" valeur={nombre(c.commandes.length - prets)} ton={c.commandes.length - prets > 0 ? "alerte" : "normal"} detail="À produire ou à recevoir pour au moins un produit" />
        <Indicateur libelle="Colis à produire" valeur={nombre(colisAProduire)} ton={colisAProduire > 0 ? "alerte" : "normal"} detail="Pour couvrir toutes les commandes" />
      </div>

      {["magasin", "ventes", "production"].includes(espace) && c.stocks.length > 0 && (
        <Carte titre="Stock des produits finis" className="mb-4">
          <Tableau entetes={["Produit", "À l'usine (physique)", "Réservé pour les commandes", "Disponible"]}>
            {c.stocks.map((x) => (
              <tr key={x.conditionnementId}>
                <Cellule className="font-semibold">
                  {x.produit} – {x.conditionnement}
                </Cellule>
                <Cellule>{enColis(x.physique, x.paquetsParColis)}</Cellule>
                <Cellule>{x.reserve ? enColis(x.reserve, x.paquetsParColis) : "—"}</Cellule>
                <Cellule className={x.disponible < 0 ? "font-bold text-red-700" : "font-bold text-green-800"}>
                  {x.disponible < 0 ? `Il manque ${enColis(-x.disponible, x.paquetsParColis)}` : enColis(x.disponible, x.paquetsParColis)}
                </Cellule>
              </tr>
            ))}
          </Tableau>
          <p className="mt-2 text-sm text-gray-600">Réservé = ce qui reste à livrer sur les commandes validées. Disponible = ce qu&apos;on peut encore promettre à un nouveau client.</p>
        </Carte>
      )}

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
              <LigneCommande
                key={x.id}
                commande={x}
                lien={lienPiece ? `/ventes/pieces/${x.id}` : undefined}
                espace={espace}
                suivi={suiviDe.get(x.id) ?? null}
                enPreparation={enPreparation.has(x.id)}
                jour={c.jour}
              />
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

/** Une commande qui ne manque que de produits achetés attend une réception, pas la production. */
function libelleEtat(x: CommandeAServir) {
  const manques = x.lignes.filter((l) => l.paquetsAProduire > 0);
  if (manques.length && manques.every((l) => l.source === "reception")) return { libelle: x.etat === "partielle" ? "En partie en stock, reste à recevoir" : "Attend une réception", ton: "alerte" as const };
  return ETATS[x.etat];
}

function LigneCommande({
  commande: x,
  lien,
  espace,
  suivi,
  enPreparation,
  jour,
}: {
  commande: CommandeAServir;
  lien?: string;
  espace: string;
  suivi: { date_souhaitee: string | null; date_confirmee: string | null } | null;
  enPreparation: boolean;
  jour: string;
}) {
  const peutPreparer = ["magasin", "ventes"].includes(espace) && x.lignes.some((l) => l.paquetsEnStock > 0);
  const peutConfirmer = ["magasin", "ventes", "logistique"].includes(espace);
  const e = libelleEtat(x);
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
          {suivi?.date_confirmee ? (
            <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ${suivi.date_confirmee < jour ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
              <Clock size={14} aria-hidden /> Promise le {formaterDate(suivi.date_confirmee)}
              {suivi.date_confirmee < jour ? " (en retard)" : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">
              <Clock size={14} aria-hidden /> Date à confirmer{suivi?.date_souhaitee ? ` (souhaitée le ${formaterDate(suivi.date_souhaitee)})` : ""} · estimée {x.dateLivraison ? formaterDate(x.dateLivraison) : "—"}
            </span>
          )}
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
                : `${l.paquetsEnStock ? `${enColis(l.paquetsEnStock, l.ligne.paquetsParColis)} en stock, ` : ""}${enColis(l.paquetsAProduire, l.ligne.paquetsParColis)} ${l.source === "reception" ? "à recevoir" : "à produire"}`}
              {l.paquetsAProduire > 0 && ` · ${l.datePrete ? `prêt le ${formaterDate(l.datePrete)}` : "date à fixer"} (${SOURCES[l.source]}${l.ordre ? ` ${l.ordre}` : ""})`}
            </span>
          </li>
        ))}
      </ul>
      {(peutPreparer || peutConfirmer) && (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          {peutPreparer && (
            <form action={preparerCommande.bind(null, x.id, espace)}>
              <Bouton type="submit">{enPreparation ? "Reprendre la préparation" : x.etat === "en_stock" ? "Préparer les colis" : "Préparer ce qui est en stock"}</Bouton>
            </form>
          )}
          {peutConfirmer && (
            <details className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3">
              <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-papel-700">{suivi?.date_confirmee ? "Changer la date promise" : "Confirmer la date au client"}</summary>
              <div className="pb-3">
                <ConfirmerDate commandeId={x.id} proposee={suivi?.date_confirmee ?? suivi?.date_souhaitee ?? x.dateLivraison ?? jour} min={x.datePiece} />
              </div>
            </details>
          )}
        </div>
      )}
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
