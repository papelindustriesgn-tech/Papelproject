import { ESPACES } from "@/lib/auth/espaces";
import { MENUS } from "./menus";

/** Écrans utiles hors des menus (création, filtres prêts à l'emploi), proposés dans les réglages des services. */
const ECRANS_SUPPLEMENTAIRES: Record<string, { href: string; libelle: string }[]> = {
  ventes: [
    { href: "/ventes/pieces/nouvelle?type=facture", libelle: "Nouvelle facture" },
    { href: "/ventes/pieces/nouvelle?type=devis", libelle: "Nouveau devis" },
    { href: "/ventes/pieces/nouvelle?type=commande", libelle: "Nouveau bon de commande" },
    { href: "/ventes/clients/nouveau", libelle: "Nouveau client" },
    { href: "/ventes/pieces?type=facture&statut=brouillon", libelle: "Factures en brouillon" },
  ],
  production: [{ href: "/production/fiches?statut=brouillon", libelle: "Fiches à valider" }],
  logistique: [
    { href: "/logistique/tournees?statut=planifiee", libelle: "Tournées planifiées" },
    { href: "/logistique/tournees?statut=en_cours", libelle: "Tournées en cours" },
  ],
  qualite: [
    { href: "/qualite/non-conformites?statut=ouverte", libelle: "Non-conformités ouvertes" },
    { href: "/qualite/non-conformites?statut=en_traitement", libelle: "Non-conformités en traitement" },
  ],
  maintenance: [
    { href: "/maintenance/interventions?statut=demandee", libelle: "Ordres de travail demandés" },
    { href: "/maintenance/interventions?statut=en_cours", libelle: "Ordres de travail en cours" },
  ],
  finance: [{ href: "/finance/fournisseurs?etat=en_retard", libelle: "Factures fournisseurs en retard" }],
};

/** Tous les écrans de l'ERP (sauf réglages et application terrain), regroupés par application. */
export function catalogueEcrans(): { href: string; libelle: string; appli: string }[] {
  const vus = new Set<string>();
  const liste: { href: string; libelle: string; appli: string }[] = [];
  for (const espace of ESPACES) {
    if (espace.code === "terrain") continue;
    const liens = [
      { href: `/${espace.code}`, libelle: "Accueil de l'application" },
      ...(MENUS[espace.code] ?? []).flatMap((e) => (e.href ? [{ href: e.href, libelle: e.libelle }] : (e.enfants ?? []))),
      ...(ECRANS_SUPPLEMENTAIRES[espace.code] ?? []),
    ];
    for (const l of liens) {
      if (vus.has(l.href) || l.href.endsWith("/reglages")) continue;
      vus.add(l.href);
      liste.push({ ...l, appli: espace.libelle });
    }
  }
  return liste;
}
