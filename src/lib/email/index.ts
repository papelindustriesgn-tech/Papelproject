import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL } from "@/lib/constants";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Envoie un email transactionnel. N'échoue jamais bruyamment : un email raté ne doit pas casser un parcours. */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const t = getTransporter();
  if (!t) {
    console.info(`[email] SMTP non configuré — email « ${subject} » non envoyé à ${to}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM ?? "Uny <bonjour@unyafrica.com>", to, subject, html, text });
    return true;
  } catch (err) {
    console.error("[email] échec d'envoi", err);
    return false;
  }
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout({ heading, body, cta, href }: { heading: string; body: string; cta: string; href: string }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15122e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4fb;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="background:#4b2fe0;background-image:linear-gradient(135deg,#4b2fe0,#7a4dff);padding:28px;">
<span style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#fff;">uny<span style="color:#ffb23f;">.</span></span>
<p style="margin:6px 0 0;color:#e4defe;font-size:13px;">Être étudiant a ses avantages.</p></td></tr>
<tr><td style="padding:28px;"><h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4766;">${body}</p>
<a href="${href}" style="display:inline-block;background:#4b2fe0;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:14px;">${cta}</a></td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #eeecf6;font-size:12px;color:#8a87a3;">Uny — le passeport étudiant africain. Guinée.</td></tr>
</table></td></tr></table></body></html>`;
}

export function welcomeEmail(firstName: string) {
  const name = escape(firstName);
  return {
    subject: "Bienvenue sur Uny 🎉",
    html: layout({
      heading: `Bienvenue ${name} !`,
      body: "Ton compte est actif et ta carte Uny est prête. Dernière étape : envoie ton justificatif étudiant pour obtenir le statut « Étudiant vérifié » et profiter de toutes les réductions.",
      cta: "Faire vérifier mon statut",
      href: `${SITE_URL}/profil/verification`,
    }),
    text: `Bienvenue ${firstName} ! Ton compte Uny est actif. Fais vérifier ton statut étudiant : ${SITE_URL}/profil/verification`,
  };
}

export function verificationApprovedEmail(firstName: string, unyId: string) {
  return {
    subject: "Ton statut étudiant est vérifié ✅",
    html: layout({
      heading: `Félicitations ${escape(firstName)} !`,
      body: `Ton statut étudiant est confirmé. Ta carte Uny <strong>${escape(unyId)}</strong> affiche désormais « Étudiant vérifié » : présente-la chez les partenaires pour profiter des avantages.`,
      cta: "Voir ma carte",
      href: `${SITE_URL}/carte`,
    }),
    text: `Félicitations ${firstName} ! Ton statut étudiant est vérifié. Ta carte : ${SITE_URL}/carte`,
  };
}

export function verificationRejectedEmail(firstName: string, reason: string | null) {
  const motif = reason ? `<br><br><strong>Motif :</strong> ${escape(reason)}` : "";
  return {
    subject: "Ton justificatif n'a pas pu être validé",
    html: layout({
      heading: `Bonjour ${escape(firstName)},`,
      body: `Nous n'avons pas pu valider le justificatif que tu as envoyé.${motif}<br><br>Pas d'inquiétude : tu peux envoyer un nouveau document lisible et à jour (carte étudiante, certificat de scolarité ou attestation d'inscription).`,
      cta: "Envoyer un nouveau justificatif",
      href: `${SITE_URL}/profil/verification`,
    }),
    text: `Bonjour ${firstName}, ton justificatif n'a pas pu être validé.${reason ? ` Motif : ${reason}.` : ""} Envoie un nouveau document : ${SITE_URL}/profil/verification`,
  };
}

export function partnerApplicationEmail(a: {
  business: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
}) {
  return {
    subject: `Nouvelle demande partenaire : ${a.business}`,
    html: layout({
      heading: "Nouvelle demande partenaire",
      body: `<strong>${escape(a.business)}</strong> (${escape(a.category)}) souhaite rejoindre Uny.<br>Contact : ${escape(a.contact)} · ${escape(a.phone)} · ${escape(a.email)}`,
      cta: "Traiter la demande",
      href: `${SITE_URL}/admin/demandes-partenaires`,
    }),
    text: `Nouvelle demande partenaire : ${a.business} (${a.category}). Contact : ${a.contact}, ${a.phone}, ${a.email}. ${SITE_URL}/admin/demandes-partenaires`,
  };
}

export function partnerAccessEmail(a: { firstName: string; business: string; email: string; password: string | null }) {
  const creds = a.password
    ? `Identifiant : <strong>${escape(a.email)}</strong><br>Mot de passe provisoire : <strong>${escape(a.password)}</strong><br>Change-le dès ta première connexion (Ma fiche → Changer de mot de passe).`
    : "Connecte-toi avec ton compte Uny habituel.";
  return {
    subject: "Ton espace partenaire Uny est prêt 🎉",
    html: layout({
      heading: `Bienvenue ${escape(a.firstName)} !`,
      body: `L'espace partenaire de <strong>${escape(a.business)}</strong> est activé : publie tes offres, ta boutique, tes logements et tes jobs, et scanne les cartes étudiantes.<br><br>${creds}`,
      cta: "Ouvrir mon espace partenaire",
      href: `${SITE_URL}/connexion?next=/partenaire`,
    }),
    text: `L'espace partenaire de ${a.business} est activé. ${a.password ? `Identifiant : ${a.email} — mot de passe provisoire : ${a.password}. ` : ""}${SITE_URL}/connexion?next=/partenaire`,
  };
}

export function universityAccessEmail(a: { firstName: string; university: string; email: string; password: string | null }) {
  const creds = a.password
    ? `Identifiant : <strong>${escape(a.email)}</strong><br>Mot de passe provisoire : <strong>${escape(a.password)}</strong><br>Change-le dès ta première connexion.`
    : "Connecte-toi avec ton compte Uny habituel.";
  return {
    subject: "Le portail université Uny est ouvert 🎓",
    html: layout({
      heading: `Bienvenue ${escape(a.firstName)} !`,
      body: `Le portail de <strong>${escape(a.university)}</strong> est activé : confirmez les inscriptions de vos étudiants, importez vos listes, personnalisez la carte Uny de l'établissement et suivez les cartes émises.<br><br>${creds}`,
      cta: "Ouvrir le portail université",
      href: `${SITE_URL}/connexion?next=/universite`,
    }),
    text: `Le portail université de ${a.university} est activé. ${a.password ? `Identifiant : ${a.email} — mot de passe provisoire : ${a.password}. ` : ""}${SITE_URL}/connexion?next=/universite`,
  };
}

/** Message interne à l'équipe Uny (texte brut repris en HTML). */
export function internalEmail(subject: string, lines: string[]) {
  return {
    subject,
    text: lines.join("\n"),
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">${lines.map(escape).join("<br>")}</div>`,
  };
}
