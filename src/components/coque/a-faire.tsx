import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { aujourdhui } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";

interface Tache {
  libelle: string;
  nombre: number;
  href: string;
  /** Urgent : en rouge (retard, rupture). */
  urgent?: boolean;
}

type Client = Awaited<ReturnType<typeof clientServeur>>;
/** Nombre de lignes d'une requête « count » (0 si la requête échoue ou si les droits la masquent). */
const n = (r: { count: number | null }) => r.count ?? 0;
const compter = { count: "exact", head: true } as const;

/** Ce qui attend l'utilisateur dans chaque application : une raison concrète d'ouvrir l'outil chaque jour. */
async function taches(espace: string, s: Client, jour: string): Promise<Tache[]> {
  switch (espace) {
    case "magasin": {
      const [rupture, seuil, inventaires] = await Promise.all([
        s.from("alertes_stock").select("article_id", compter).eq("niveau_alerte", "rupture"),
        s.from("alertes_stock").select("article_id", compter).neq("niveau_alerte", "rupture"),
        s.from("inventaires").select("id", compter).eq("statut", "en_cours"),
      ]);
      return [
        { libelle: "Article(s) en rupture", nombre: n(rupture), href: "/magasin/articles", urgent: true },
        { libelle: "Article(s) bientôt en rupture : demander un achat", nombre: n(seuil), href: "/magasin/demandes" },
        { libelle: "Inventaire(s) à terminer", nombre: n(inventaires), href: "/magasin/inventaires" },
      ];
    }
    case "production": {
      const [fiches, ordres, pannes] = await Promise.all([
        s.from("fiches_production").select("id", compter).eq("statut", "brouillon"),
        s.from("ordres_fabrication").select("id", compter).in("statut", ["planifie", "en_cours"]),
        s.from("interventions").select("id", compter).eq("type_intervention", "curative").in("statut", ["demandee", "en_cours"]),
      ]);
      return [
        { libelle: "Fiche(s) de poste à valider", nombre: n(fiches), href: "/production/fiches?statut=brouillon", urgent: true },
        { libelle: "Ordre(s) de fabrication à produire", nombre: n(ordres), href: "/production/ordres" },
        { libelle: "Panne(s) en cours de réparation", nombre: n(pannes), href: "/production/pannes" },
      ];
    }
    case "ventes": {
      const [brouillons, echues, aLivrer] = await Promise.all([
        s.from("pieces_vente").select("id", compter).eq("statut", "brouillon"),
        s.from("factures_etat").select("id", compter).gt("solde_gnf", 0).gt("jours_retard", 0),
        s.from("reste_a_livrer").select("commande_id").gt("paquets_restants", 0).limit(5000),
      ]);
      return [
        { libelle: "Facture(s) en retard de paiement : relancer", nombre: n(echues), href: "/ventes/impayes", urgent: true },
        { libelle: "Commande(s) à livrer", nombre: new Set((aLivrer.data ?? []).map((l) => l.commande_id)).size, href: "/ventes/pieces?type=commande" },
        { libelle: "Brouillon(s) à valider (devis, factures…)", nombre: n(brouillons), href: "/ventes/pieces?type=facture&statut=brouillon" },
      ];
    }
    case "commercial": {
      const [reclamations, sansVisite] = await Promise.all([
        s.from("non_conformites").select("id", compter).eq("origine", "client").neq("statut", "cloturee"),
        s.from("pva").select("id", compter).eq("actif", true).is("position", null),
      ]);
      return [
        { libelle: "Réclamation(s) client à suivre", nombre: n(reclamations), href: "/commercial/reclamations", urgent: true },
        { libelle: "Point(s) de vente sans position GPS", nombre: n(sansVisite), href: "/commercial/portefeuilles" },
      ];
    }
    case "achats": {
      const [demandes, brouillons] = await Promise.all([
        s.from("demandes_achat").select("id", compter).eq("statut", "soumise"),
        s.from("bons_commande").select("id", compter).eq("statut", "brouillon"),
      ]);
      return [
        { libelle: "Demande(s) d'achat à approuver", nombre: n(demandes), href: "/achats/demandes", urgent: true },
        { libelle: "Bon(s) de commande à envoyer", nombre: n(brouillons), href: "/achats/commandes" },
      ];
    }
    case "logistique": {
      const [aPlanifier, enCours] = await Promise.all([
        s.from("livraisons").select("id", compter).eq("statut", "validee").is("tournee_id", null).eq("statut_remise", "a_livrer"),
        s.from("tournees_livraison").select("id", compter).eq("statut", "en_cours"),
      ]);
      return [
        { libelle: "Livraison(s) à mettre dans une tournée", nombre: n(aPlanifier), href: "/logistique/tournees/nouvelle", urgent: true },
        { libelle: "Tournée(s) en cours à terminer", nombre: n(enCours), href: "/logistique/tournees?statut=en_cours" },
      ];
    }
    case "qualite": {
      const [ouvertes, controles, retard] = await Promise.all([
        s.from("non_conformites").select("id", compter).eq("statut", "ouverte"),
        s.from("controles_qualite").select("id", compter).eq("statut", "brouillon"),
        s.from("actions_correctives").select("id", compter).is("realisee_le", null).lt("echeance", jour),
      ]);
      return [
        { libelle: "Non-conformité(s) à analyser", nombre: n(ouvertes), href: "/qualite/non-conformites?statut=ouverte", urgent: true },
        { libelle: "Action(s) corrective(s) en retard", nombre: n(retard), href: "/qualite/non-conformites?statut=en_traitement", urgent: true },
        { libelle: "Contrôle(s) à terminer", nombre: n(controles), href: "/qualite/controles" },
      ];
    }
    case "maintenance": {
      const [demandees, enCours, preventif] = await Promise.all([
        s.from("interventions").select("id", compter).eq("statut", "demandee"),
        s.from("interventions").select("id", compter).eq("statut", "en_cours"),
        s.from("echeances_preventif").select("id", compter).lte("jours_restants", 0),
      ]);
      return [
        { libelle: "Panne(s) ou demande(s) à prendre en charge", nombre: n(demandees), href: "/maintenance/interventions?statut=demandee", urgent: true },
        { libelle: "Entretien(s) préventif(s) en retard", nombre: n(preventif), href: "/maintenance/preventif", urgent: true },
        { libelle: "Intervention(s) en cours à terminer", nombre: n(enCours), href: "/maintenance/interventions?statut=en_cours" },
      ];
    }
    case "finance": {
      const [fournisseurs, clients] = await Promise.all([
        s.from("factures_fournisseurs_etat").select("id", compter).gt("solde_gnf", 0).gt("jours_retard", 0),
        s.from("factures_etat").select("id", compter).gt("solde_gnf", 0).gt("jours_retard", 0),
      ]);
      return [
        { libelle: "Facture(s) fournisseur en retard : payer", nombre: n(fournisseurs), href: "/finance/fournisseurs?etat=en_retard", urgent: true },
        { libelle: "Facture(s) client en retard : relancer", nombre: n(clients), href: "/ventes/impayes" },
      ];
    }
    default:
      return [];
  }
}

/** Bloc « À faire aujourd'hui » de l'entrée d'une application : seulement ce qui attend, le plus urgent d'abord. */
export async function AFaire({ espace }: { espace: string }) {
  const liste = (await taches(espace, await clientServeur(), aujourdhui())).filter((t) => t.nombre > 0).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  return (
    <section aria-label="À faire aujourd'hui" className="mb-4 rounded-xl border border-gray-200 bg-white print:hidden">
      <h2 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-gray-500">À faire aujourd&apos;hui</h2>
      {liste.length ? (
        <ul className="divide-y divide-gray-100">
          {liste.map((t) => (
            <li key={t.libelle}>
              <Link href={t.href} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-gray-50 active:bg-gray-100">
                <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 font-bold ${t.urgent ? "bg-red-100 text-red-800" : "bg-papel-100 text-papel-800"}`}>{t.nombre}</span>
                <span className="min-w-0 flex-1 font-semibold text-gray-900">{t.libelle}</span>
                <ChevronRight size={20} className="shrink-0 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 px-4 py-3 font-semibold text-green-800">
          <CheckCircle2 size={20} /> Rien en attente : tout est à jour.
        </p>
      )}
    </section>
  );
}
