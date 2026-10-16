/**
 * Rapport hebdomadaire envoyé par e-mail à la Direction (fonctions pures, testées).
 * Les chiffres viennent de la fonction SQL `rapport_hebdomadaire` ; ici, uniquement la mise en forme.
 */

export interface DonneesRapport {
  du: string;
  au: string;
  entreprise: string | null;
  ca_ht_gnf: number;
  ca_ht_prec_gnf: number;
  encaisse_gnf: number;
  paquets_vendus: number;
  creances_echues_gnf: number;
  paquets_produits: number;
  fiches: number;
  kg_papier: number;
  kg_mp: number;
  kg_transit: number;
  tresorerie_gnf: number;
  dettes_echues_gnf: number;
  alertes_stock: string[];
  nc_ouvertes: number;
  nc_critiques: number;
  pannes: number;
  ot_ouverts: number;
  bl_non_remis: number;
  destinataires: string | null;
}

const ESPACE = " "; // espace fine insécable, séparateur de milliers français
const entier = (n: number) => Math.round(Number(n)).toLocaleString("fr-FR").replace(/[  ]/g, ESPACE);
const gnf = (n: number) => `${entier(n)} GNF`;
const date = (iso: string) => iso.split("-").reverse().join("/");
const tonnes = (kg: number) => `${(Number(kg) / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`;

export function echapperHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Variation relative arrondie au pour cent, avec signe ; null si pas de base. */
export function variation(actuel: number, precedent: number): string | null {
  if (!precedent) return null;
  const v = Math.round(((actuel - precedent) / Math.abs(precedent)) * 100);
  return `${v > 0 ? "+" : ""}${v} %`;
}

/** Adresses valides de la liste « a@b.gn, c@d.com » (les autres sont ignorées). */
export function lireDestinataires(liste: string | null): string[] {
  return (liste ?? "")
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
}

export function sujetRapport(d: DonneesRapport): string {
  return `${d.entreprise ?? "Papel"} – rapport de la semaine du ${date(d.du)} au ${date(d.au)}`;
}

/** Points d'attention, du plus grave au moins grave. */
export function pointsAttention(d: DonneesRapport): string[] {
  const p: string[] = [];
  if (d.nc_critiques) p.push(`${d.nc_critiques} non-conformité(s) critique(s) ouverte(s)`);
  if (d.creances_echues_gnf > 0) p.push(`Créances clients échues : ${gnf(d.creances_echues_gnf)}`);
  if (d.dettes_echues_gnf > 0) p.push(`Dettes fournisseurs échues : ${gnf(d.dettes_echues_gnf)}`);
  if (d.bl_non_remis) p.push(`${d.bl_non_remis} bon(s) de livraison non remis depuis plus de 2 jours`);
  for (const a of d.alertes_stock) p.push(`Stock – ${a}`);
  if (d.ot_ouverts) p.push(`${d.ot_ouverts} ordre(s) de travail de maintenance ouvert(s)`);
  return p;
}

export function rapportTexte(d: DonneesRapport): string {
  const v = variation(d.ca_ht_gnf, d.ca_ht_prec_gnf);
  return [
    sujetRapport(d),
    "",
    `Ventes : ${gnf(d.ca_ht_gnf)} HT${v ? ` (${v} vs semaine précédente)` : ""} · ${entier(d.paquets_vendus)} paquets · encaissé ${gnf(d.encaisse_gnf)}`,
    `Production : ${entier(d.paquets_produits)} paquets sur ${d.fiches} fiche(s) · papier consommé ${tonnes(d.kg_papier)}${d.kg_papier > 0 ? ` (${entier((d.paquets_produits / d.kg_papier) * 1000)} paquets/t)` : ""}`,
    `Stock matière : ${tonnes(d.kg_mp)} · en transit ${tonnes(d.kg_transit)}`,
    `Trésorerie : ${gnf(d.tresorerie_gnf)}`,
    `Qualité : ${d.nc_ouvertes} NC ouverte(s) · Maintenance : ${d.pannes} panne(s) cette semaine`,
    "",
    "Points d'attention :",
    ...(pointsAttention(d).length ? pointsAttention(d).map((x) => `- ${x}`) : ["- aucun"]),
  ].join("\n");
}

export function rapportHtml(d: DonneesRapport, lienErp: string): string {
  const v = variation(d.ca_ht_gnf, d.ca_ht_prec_gnf);
  const ligne = (libelle: string, valeur: string, detail = "") =>
    `<tr><td style="padding:6px 8px;color:#374151">${echapperHtml(libelle)}</td><td style="padding:6px 8px;font-weight:600">${echapperHtml(valeur)}</td><td style="padding:6px 8px;color:#6b7280">${echapperHtml(detail)}</td></tr>`;
  const points = pointsAttention(d);
  return `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;margin:0;padding:16px;background:#f3f4f6">
<div style="max-width:640px;margin:auto;background:#fff;border-radius:8px;overflow:hidden">
<div style="background:#07524D;color:#fff;padding:16px"><strong>${echapperHtml(sujetRapport(d))}</strong></div>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${ligne("Chiffre d'affaires HT", gnf(d.ca_ht_gnf), v ? `${v} vs semaine précédente` : "")}
${ligne("Paquets vendus", entier(d.paquets_vendus))}
${ligne("Encaissements", gnf(d.encaisse_gnf))}
${ligne("Production", `${entier(d.paquets_produits)} paquets`, `${d.fiches} fiche(s), ${tonnes(d.kg_papier)} de papier`)}
${ligne("Stock matière première", tonnes(d.kg_mp), `en transit : ${tonnes(d.kg_transit)}`)}
${ligne("Trésorerie", gnf(d.tresorerie_gnf))}
${ligne("Qualité", `${d.nc_ouvertes} NC ouverte(s)`, d.nc_critiques ? `${d.nc_critiques} critique(s)` : "")}
${ligne("Maintenance", `${d.pannes} panne(s)`, `${d.ot_ouverts} OT ouvert(s)`)}
</table>
<div style="padding:12px 16px"><strong>Points d'attention</strong><ul style="margin:6px 0;padding-left:20px">${
    points.length ? points.map((p) => `<li>${echapperHtml(p)}</li>`).join("") : "<li>Aucun</li>"
  }</ul>
<p><a href="${echapperHtml(lienErp)}/direction" style="color:#07524D;font-weight:600">Ouvrir le tableau de bord</a></p></div>
</div></body></html>`;
}
