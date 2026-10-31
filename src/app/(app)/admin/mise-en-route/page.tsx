import { CheckCircle2, ChevronRight, Circle, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/ui";
import { exigerConnexion } from "@/lib/auth/session";
import { formaterDate } from "@/lib/formulaires/dates";
import { clientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Mise en route" };

type Etat = "fait" | "a_faire" | "a_verifier";
interface Etape {
  titre: string;
  detail: string;
  lien: string;
  etat: Etat;
}

/**
 * Mise en route : ce qu'il faut saisir pour utiliser l'ERP avec les vraies données de Papel, dans l'ordre,
 * avec l'état de chaque étape (fait / à faire, ou à vérifier quand l'ERP ne peut pas le savoir seul).
 */
export default async function MiseEnRoute() {
  const u = await exigerConnexion();
  const supabase = await clientServeur();
  const compter = { count: "exact" as const, head: true };
  const [entreprise, comptes, soldes, fournisseurs, mouvements, cadences, operateurs, clients, commerciaux, employes, vehicules, equipements, objectif, bobines, comptageEnCours] = await Promise.all([
    supabase.from("parametres").select("cle, valeur").in("cle", ["entreprise_telephone", "entreprise_nif", "entreprise_rccm"]),
    supabase.from("profils").select("id", compter).eq("actif", true),
    supabase.from("comptes_tresorerie").select("id", compter).eq("actif", true).neq("solde_initial", 0).neq("libelle", "Banque – financement du projet"),
    supabase.from("fournisseurs").select("id", compter).eq("actif", true),
    supabase.from("mouvements_stock").select("id", compter),
    supabase.from("cadences_nominales").select("ligne_id", compter),
    supabase.from("operateurs").select("id", compter),
    supabase.from("clients").select("id", compter),
    supabase.from("utilisateur_roles").select("utilisateur_id", compter).eq("role", "commercial_terrain"),
    supabase.from("employes").select("id", compter),
    supabase.from("vehicules").select("id", compter),
    supabase.from("equipements").select("id", compter),
    supabase.from("objectifs_services").select("mois").order("mois").limit(1).maybeSingle(),
    supabase.from("lots").select("id", compter),
    supabase.from("inventaires").select("id, libelle, date_inventaire").eq("statut", "en_cours").order("date_inventaire").limit(1).maybeSingle(),
  ]);
  const n = (r: { count: number | null }) => r.count ?? 0;
  const infosEntreprise = (entreprise.data ?? []).every((p) => String(p.valeur ?? "").replace(/"/g, "").trim() !== "");
  const premierMois = objectif.data?.mois ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(objectif.data.mois)) : null;

  const groupes: { titre: string; etapes: Etape[] }[] = [
    {
      titre: "1. Votre entreprise et vos accès",
      etapes: [
        { titre: "Votre nom et votre mot de passe", detail: "Mettez votre vrai nom et changez le mot de passe de votre compte.", lien: `/admin/utilisateurs/${u.id}`, etat: "a_verifier" },
        { titre: "Informations de l'entreprise", detail: "Téléphone, NIF et RCCM : ils apparaissent sur les factures.", lien: "/admin/parametres", etat: infosEntreprise ? "fait" : "a_faire" },
        { titre: "Comptes de vos équipes", detail: "Un compte par personne, avec son rôle (magasin, production, finance…).", lien: "/admin/utilisateurs", etat: n(comptes) > 1 ? "fait" : "a_faire" },
      ],
    },
    {
      titre: "2. Argent et achats",
      etapes: [
        { titre: "Soldes d'ouverture des caisses et banques", detail: "Le montant de chaque compte le jour où vous commencez.", lien: "/finance/listes/comptes-tresorerie", etat: n(soldes) > 0 ? "fait" : "a_faire" },
        { titre: "Fournisseurs", detail: "Coordonnées complètes (le fournisseur « Lu » attend sa raison sociale).", lien: "/achats/listes/fournisseurs", etat: n(fournisseurs) > 0 ? "a_verifier" : "a_faire" },
        { titre: "Prix de vente", detail: "Prix au paquet par produit (TVA ajoutée sur la facture).", lien: "/admin/produits", etat: "a_verifier" },
      ],
    },
    {
      titre: "3. Usine",
      etapes: [
        { titre: "Bobines en stock", detail: "Enregistrez chaque bobine présente à l'usine (numéro et poids) : Bobines → Réceptionner.", lien: "/magasin/bobines", etat: n(bobines) > 0 ? "fait" : "a_faire" },
        comptageEnCours.data
          ? {
              titre: "Stock de départ : comptage à terminer",
              detail: `« ${comptageEnCours.data.libelle} », commencé le ${formaterDate(comptageEnCours.data.date_inventaire)}, n'est pas validé : le stock reste à zéro. Ouvrez-le et validez (les cases vides gardent leur stock).`,
              lien: `/magasin/inventaires/${comptageEnCours.data.id}`,
              etat: "a_faire" as const,
            }
          : {
              titre: "Stock de départ (emballages, produits finis)",
              detail: "Faites un inventaire : chaque quantité comptée devient le stock de départ.",
              lien: "/magasin/inventaires",
              etat: n(mouvements) > 0 ? ("fait" as const) : ("a_faire" as const),
            },
        { titre: "Opérateurs", detail: "Les opérateurs de chaque équipe (sans compte informatique).", lien: "/production/listes/operateurs", etat: n(operateurs) > 0 ? "fait" : "a_faire" },
        { titre: "Cadences des machines", detail: "Paquets par minute par ligne et par produit : nécessaires au calcul de l'efficacité des machines.", lien: "/production/listes/cadences", etat: n(cadences) > 0 ? "fait" : "a_faire" },
        { titre: "Équipements", detail: "Machines de la ligne, pour la maintenance et les pannes.", lien: "/maintenance/listes/equipements", etat: n(equipements) > 0 ? "fait" : "a_faire" },
      ],
    },
    {
      titre: "4. Ventes et personnel",
      etapes: [
        { titre: "Clients", detail: "Grossistes, semi-grossistes… avec leur plafond de crédit.", lien: "/ventes/clients", etat: n(clients) > 0 ? "fait" : "a_faire" },
        { titre: "Commerciaux terrain", detail: "Un compte « commercial terrain » par commercial, avec sa série de factures.", lien: "/admin/utilisateurs", etat: n(commerciaux) > 0 ? "fait" : "a_faire" },
        { titre: "Véhicules et chauffeurs", detail: "Pour organiser les livraisons.", lien: "/logistique/listes/vehicules", etat: n(vehicules) > 0 ? "fait" : "a_faire" },
        { titre: "Employés", detail: "Dossiers du personnel pour les présences, congés et la paie.", lien: "/rh/employes", etat: n(employes) > 0 ? "fait" : "a_faire" },
      ],
    },
    {
      titre: "5. Pilotage",
      etapes: [
        {
          titre: "Date de démarrage des objectifs",
          detail: premierMois ? `Les objectifs mensuels commencent en ${premierMois} : décalez-les si l'usine démarre plus tard.` : "Saisissez vos objectifs mensuels.",
          lien: "/direction/objectifs",
          etat: "a_verifier",
        },
        { titre: "Seuils d'alerte et pages d'accueil", detail: "Réglez ce que chaque service voit en premier et quand une alerte se déclenche.", lien: "/admin/reglages", etat: "a_verifier" },
      ],
    },
  ];
  const toutes = groupes.flatMap((g) => g.etapes);
  const faites = toutes.filter((e) => e.etat === "fait").length;

  return (
    <>
      <TitrePage titre="Mise en route" sousTitre={`${faites} étape(s) faite(s) sur ${toutes.length} · tout se saisit ici, sans rien demander à personne`} />
      <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="Avancement de la mise en route" aria-valuenow={faites} aria-valuemin={0} aria-valuemax={toutes.length}>
        <div className="h-full rounded-full bg-papel-600" style={{ width: `${(faites / toutes.length) * 100}%` }} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groupes.map((g) => (
          <section key={g.titre} className="ombre-carte rounded-2xl bg-white p-4">
            <h2 className="mb-2 font-bold text-gray-900">{g.titre}</h2>
            <ul className="divide-y divide-gray-100">
              {g.etapes.map((e) => (
                <li key={e.titre}>
                  <Link href={e.lien} className="flex min-h-14 items-center gap-3 py-2.5 hover:bg-gray-50">
                    {e.etat === "fait" ? (
                      <CheckCircle2 size={22} className="shrink-0 text-papel-600" aria-hidden />
                    ) : e.etat === "a_verifier" ? (
                      <Eye size={22} className="shrink-0 text-amber-600" aria-hidden />
                    ) : (
                      <Circle size={22} className="shrink-0 text-gray-300" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900">{e.titre}</span>
                      <span className="block text-sm text-gray-600">{e.detail}</span>
                    </span>
                    <span className={`shrink-0 text-xs font-bold ${e.etat === "fait" ? "text-papel-700" : e.etat === "a_verifier" ? "text-amber-700" : "text-gray-500"}`}>
                      {e.etat === "fait" ? "Fait" : e.etat === "a_verifier" ? "À vérifier" : "À faire"}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
