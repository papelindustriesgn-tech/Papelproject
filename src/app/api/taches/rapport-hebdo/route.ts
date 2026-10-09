import { aujourdhui } from "@/lib/formulaires/dates";
import { lireDestinataires, rapportHtml, rapportTexte, sujetRapport, type DonneesRapport } from "@/lib/rapports/hebdo";
import { clientTachePlanifiee } from "@/lib/supabase/admin";

/**
 * Tâche planifiée (Vercel Cron, chaque lundi 07:00 Conakry — voir vercel.json) : rapport des 7 derniers jours
 * envoyé par e-mail aux destinataires du paramètre `rapport_destinataires`.
 * Protégée par CRON_SECRET (en-tête « Authorization: Bearer … » ajouté automatiquement par Vercel).
 * Envoi via l'API Resend (RESEND_API_KEY, RAPPORT_EXPEDITEUR) ; sans clé, le rapport est calculé mais pas envoyé.
 */
export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || requete.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const fin = new Date(`${aujourdhui()}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() - 1);
  const debut = new Date(fin);
  debut.setUTCDate(debut.getUTCDate() - 6);
  const du = debut.toISOString().slice(0, 10);
  const au = fin.toISOString().slice(0, 10);

  const { data, error } = await clientTachePlanifiee().rpc("rapport_hebdomadaire", { p_du: du, p_au: au });
  if (error || !data) return Response.json({ erreur: "Calcul du rapport impossible." }, { status: 500 });
  const rapport = data as unknown as DonneesRapport;

  const destinataires = lireDestinataires(rapport.destinataires);
  const cle = process.env.RESEND_API_KEY;
  const expediteur = process.env.RAPPORT_EXPEDITEUR;
  if (!cle || !expediteur || !destinataires.length) {
    return Response.json({ envoye: false, raison: "Envoi non configuré (RESEND_API_KEY, RAPPORT_EXPEDITEUR, paramètre rapport_destinataires).", du, au });
  }
  const lien = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(requete.url).origin;
  const envoi = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: expediteur, to: destinataires, subject: sujetRapport(rapport), html: rapportHtml(rapport, lien), text: rapportTexte(rapport) }),
  });
  if (!envoi.ok) return Response.json({ envoye: false, raison: `Service d'e-mail : ${envoi.status}` }, { status: 502 });
  return Response.json({ envoye: true, destinataires: destinataires.length, du, au });
}
