/** Signaux affichés sur les inscriptions à valider (mêmes codes que la fonction SQL flag_new_signup). */
export const SIGNUP_FLAGS: Record<string, { label: string; hint: string }> = {
  domaine_reserve: { label: "Email fictif", hint: "Domaine réservé (example.com…) : aucune boîte mail réelle" },
  email_jetable: { label: "Email jetable", hint: "Adresse temporaire (yopmail, mailinator…)" },
  rafale: { label: "Rafale", hint: "Créé pendant une vague de 15 inscriptions ou plus en 10 minutes" },
  identite_double: { label: "Identité en double", hint: "Même nom, prénom et date de naissance qu'un autre compte" },
};

const RESERVED = /@(example\.(com|org|net)|test\.com|localhost)$|\.(test|example|invalid)$/i;

/** Signaux d'un compte, y compris ceux créés avant la détection automatique (email fictif). */
export function signupFlags(p: { signup_flags: string[]; email: string | null }) {
  const flags = new Set(p.signup_flags);
  if (p.email && RESERVED.test(p.email)) flags.add("domaine_reserve");
  return [...flags];
}

/** Filtre PostgREST « suspects » (signaux enregistrés ou email fictif). */
export const SUSPECT_FILTER =
  "signup_flags.neq.{},email.ilike.*@example.com,email.ilike.*@example.org,email.ilike.*@example.net,email.ilike.*@test.com";
