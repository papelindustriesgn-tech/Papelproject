import "server-only";
import { cache } from "react";
import type { AlerteEspace } from "@/components/alertes/liste-alertes";
import { chargerAlertes, type Alerte } from "@/lib/direction/alertes";
import { chargerCoordination } from "@/lib/coordination/charger";
import { aujourdhui, ilYA } from "@/lib/formulaires/dates";
import { CALCULS } from "@/lib/navigation/calculs";
import { clientServeur } from "@/lib/supabase/serveur";

export type { AlerteEspace };

/** Domaines des alertes de l'entreprise (`chargerAlertes`) montrés dans chaque application ; la Direction voit tout. */
const DOMAINES: Record<string, Alerte["domaine"][]> = {
  magasin: ["Stock"],
  achats: ["Stock"],
  production: ["Production"],
  ventes: ["Ventes", "Logistique"],
  finance: ["Ventes"],
  commercial: ["Distribution", "Ventes"],
  logistique: ["Logistique"],
  qualite: ["Qualité"],
  maintenance: ["Maintenance"],
};

/** Applications qui ont une page « Alertes » (l'administration et le terrain n'en ont pas). */
export const ESPACES_ALERTES = ["direction", "magasin", "production", "ventes", "commercial", "achats", "logistique", "qualite", "maintenance", "finance", "rh"];

/** Lignes « À faire » choisies par l'administrateur (Réglages des services) pour plusieurs applications à la fois. */
const chargerTaches = cache(async (espaces: string): Promise<Map<string, AlerteEspace[]>> => {
  const liste = espaces.split(",");
  const s = await clientServeur();
  const { data } = await s.from("accueil_elements").select("espace, libelle, ecran, indicateur, urgent, seuil").eq("genre", "tache").eq("actif", true).in("espace", liste).order("ordre");
  const jour = aujourdhui();
  // Chaque indicateur n'est compté qu'une fois, même s'il apparaît dans plusieurs applications.
  const codes = [...new Set((data ?? []).map((t) => t.indicateur ?? "").filter((c) => CALCULS[c]))];
  const nombres = new Map(await Promise.all(codes.map(async (c) => [c, await CALCULS[c](s, jour).catch(() => 0)] as const)));
  const resultat = new Map<string, AlerteEspace[]>();
  for (const t of data ?? []) {
    const n = nombres.get(t.indicateur ?? "") ?? 0;
    if (n < Math.max(1, t.seuil)) continue;
    resultat.set(t.espace, [...(resultat.get(t.espace) ?? []), { gravite: t.urgent ? "critique" : "importante", domaine: "À faire", message: t.libelle, lien: t.ecran, nombre: n }]);
  }
  return resultat;
});

/** Alertes de coordination : commandes clients qui attendent du stock ou de la production, livraisons signalées. */
async function alertesCoordination(espace: string): Promise<AlerteEspace[]> {
  if (!["magasin", "production", "ventes", "logistique", "commercial", "direction"].includes(espace)) return [];
  const c = await chargerCoordination();
  const alertes: AlerteEspace[] = [];
  if (c) {
    const prets = c.commandes.filter((x) => x.etat === "en_stock").length;
    const aProduire = c.commandes.length - prets;
    if (prets && ["magasin", "logistique", "ventes"].includes(espace))
      alertes.push({ gravite: "importante", domaine: "Commandes", message: `${prets} commande(s) client prête(s) en stock, à préparer et livrer`, lien: `/${espace}/commandes`, nombre: prets });
    if (aProduire && espace !== "logistique") {
      const colis = c.besoins.reduce((s, b) => s + Math.ceil(b.paquetsAProduire / b.paquetsParColis), 0);
      alertes.push({
        gravite: espace === "production" ? "critique" : "importante",
        domaine: "Commandes",
        message: `${aProduire} commande(s) client en attente de production (${colis.toLocaleString("fr-FR")} colis à produire)`,
        lien: espace === "direction" ? "/production/commandes" : `/${espace}/commandes`,
        nombre: aProduire,
      });
    }
  }
  if (["ventes", "logistique", "commercial", "direction"].includes(espace)) {
    const s = await clientServeur();
    const depuis = `${ilYA(30)}T00:00:00Z`;
    const { data } = await s.from("livraisons").select("numero").eq("confirmation", "probleme").gte("confirmee_le", depuis);
    if (data?.length)
      alertes.push({
        gravite: "critique",
        domaine: "Livraisons",
        message: `Problème signalé par le commercial sur ${data.length} livraison(s) : ${data.map((l) => l.numero).join(", ")}`,
        lien: espace === "direction" ? "/ventes/commandes" : `/${espace}/commandes`,
        nombre: data.length,
      });
  }
  return alertes;
}

/**
 * Alertes d'une application, critiques d'abord. `groupe` : applications dont les lignes « À faire » sont
 * comptées ensemble (pastilles du menu), sinon l'application seule.
 */
async function assembler(espace: string, groupe: string): Promise<AlerteEspace[]> {
  const [entreprise, taches, coordination] = await Promise.all([chargerAlertes(), chargerTaches(groupe), alertesCoordination(espace)]);
  const domaines = DOMAINES[espace];
  const alertes: AlerteEspace[] = [...(taches.get(espace) ?? []), ...coordination, ...entreprise.filter((a) => espace === "direction" || domaines?.includes(a.domaine))];
  return alertes.sort((x, y) => (x.gravite === y.gravite ? 0 : x.gravite === "critique" ? -1 : 1));
}

/** Toutes les alertes d'une application (page « Alertes »). */
export const chargerAlertesEspace = cache((espace: string) => assembler(espace, espace));

/**
 * Pastilles rouges du menu : nombre d'alertes et de tâches reçues en attente pour chaque application accessible,
 * par lien de menu (« /magasin/alertes », « /magasin/taches »). Calcul groupé (une seule fois par page).
 */
export async function chargerPastilles(espaces: string[]): Promise<Record<string, number>> {
  const avecAlertes = espaces.filter((e) => ESPACES_ALERTES.includes(e));
  if (!avecAlertes.length) return {};
  const s = await clientServeur();
  // Les lignes « À faire » de toutes les applications sont comptées en une fois.
  const groupe = avecAlertes.join(",");
  const [alertes, { data: taches }] = await Promise.all([
    Promise.all(avecAlertes.map(async (e) => [e, (await assembler(e, groupe)).length] as const)),
    s.from("taches").select("espace_destinataire").in("statut", ["a_faire", "en_cours"]).in("espace_destinataire", avecAlertes).limit(2000),
  ]);
  const pastilles: Record<string, number> = {};
  for (const [e, n] of alertes) if (n) pastilles[`/${e}/alertes`] = n;
  for (const t of taches ?? []) pastilles[`/${t.espace_destinataire}/taches`] = (pastilles[`/${t.espace_destinataire}/taches`] ?? 0) + 1;
  return pastilles;
}
