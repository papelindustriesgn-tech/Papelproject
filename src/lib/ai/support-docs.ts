/**
 * Documentation validée pour l'assistant (seule source autorisée pour décrire les fonctionnalités).
 * Toute modification doit refléter le comportement réel de l'application ; revue humaine obligatoire.
 * Dernière revue : 22/10/2026.
 */
export type SupportDoc = { id: string; title: string; keywords: string[]; body: string };

export const SUPPORT_DOCS: SupportDoc[] = [
  {
    id: "compte-validation",
    title: "Mon compte est en attente",
    keywords: ["attente", "validation", "inscription", "compte", "bloqué", "accès"],
    body: "Après l'inscription, chaque compte étudiant est vérifié par l'équipe Uny avant d'accéder à la carte. La création du compte ne vaut pas validation. Tu reçois une notification quand la décision est prise.",
  },
  {
    id: "verification",
    title: "Vérifier mon statut étudiant",
    keywords: ["vérification", "justificatif", "statut", "étudiant", "document", "certificat", "matricule"],
    body: "Ouvre Profil → Vérification étudiante. Complète ton profil puis envoie ton justificatif (ou fais la demande auprès de ton établissement s'il est partenaire). L'équipe Uny ou l'établissement valide ton statut, généralement sous 48 h, sans garantie de délai.",
  },
  {
    id: "a-completer",
    title: "Ma demande est « À compléter »",
    keywords: ["compléter", "incomplet", "motif", "refus", "refusée"],
    body: "L'établissement a besoin d'une information supplémentaire : le motif est affiché sur ta demande et dans tes notifications. Corrige ce qui est demandé puis renvoie ta demande. En cas de refus, le motif est aussi indiqué.",
  },
  {
    id: "carte",
    title: "Ma carte Uny",
    keywords: ["carte", "qr", "hors ligne", "expirée", "révoquée", "valable"],
    body: "La carte se trouve dans l'onglet « Ma carte ». Hors connexion, la dernière version enregistrée s'affiche avec sa date d'actualisation ; la validité réelle est toujours vérifiée en ligne par le commerçant. Une carte expirée ou révoquée par l'établissement n'est plus acceptée.",
  },
  {
    id: "coupons",
    title: "Utiliser une réduction ou un code promo",
    keywords: ["code", "promo", "coupon", "réduction", "avantage", "offre", "flash"],
    body: "Ouvre l'offre dans « Avantages » et demande ton code : il est personnel, valable 7 jours et utilisable une seule fois. Le commerçant le vérifie en caisse ; l'offre doit encore être active et ta carte valable au moment de l'utilisation. Les offres flash ont un nombre de places limité.",
  },
  {
    id: "paiement",
    title: "Paiement",
    keywords: ["payer", "paiement", "orange money", "argent", "rembourser", "remboursement"],
    body: "Uny n'encaisse aucun paiement. Tu paies directement le commerçant (espèces ou Orange Money vers son code marchand). Pour un remboursement, adresse-toi au commerçant.",
  },
  {
    id: "marketplace",
    title: "Marketplace : signaler ou bloquer",
    keywords: ["marketplace", "annonce", "signaler", "bloquer", "arnaque", "vendeur"],
    body: "Sur une annonce, « Signaler l'annonce » envoie un signalement à l'équipe Uny. « Bloquer le vendeur » masque ses annonces pour toi ; tu peux le débloquer depuis « Mes annonces ». Rencontre-toi dans un lieu public et vérifie l'article avant de payer. Règles : page « Règles de la marketplace ».",
  },
  {
    id: "jobs-logement",
    title: "Jobs, logement, marketplace",
    keywords: ["job", "emploi", "stage", "logement", "chambre", "opportunités"],
    body: "Ces rubriques sont regroupées dans l'onglet « Opportunités ».",
  },
  {
    id: "suppression",
    title: "Supprimer mon compte",
    keywords: ["supprimer", "suppression", "effacer", "données", "compte"],
    body: "Profil → Sécurité → « Supprimer mon compte » : tape SUPPRIMER et ton mot de passe. Sans accès à ton compte, suis la page « Supprimer mon compte » du site. L'assistant ne peut pas supprimer un compte à ta place.",
  },
  {
    id: "mot-de-passe",
    title: "Mot de passe oublié",
    keywords: ["mot de passe", "connexion", "oublié", "réinitialiser"],
    body: "Sur l'écran de connexion, choisis « Mot de passe oublié » et suis le lien reçu par email.",
  },
  {
    id: "notifications",
    title: "Notifications",
    keywords: ["notification", "email", "alertes", "préférences"],
    body: "Tes notifications sont dans l'onglet Notifications. Tes préférences d'emails se règlent dans Profil → Paramètres.",
  },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Recherche déterministe (mots-clés) : fonctionne aussi sans IA. */
export function searchDocs(question: string, limit = 3) {
  const q = norm(question);
  return SUPPORT_DOCS.map((d) => ({
    doc: d,
    score: d.keywords.reduce((s, k) => s + (q.includes(norm(k)) ? 2 : 0), 0) + (q.includes(norm(d.title)) ? 3 : 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.doc);
}
