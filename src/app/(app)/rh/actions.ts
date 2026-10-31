"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerEspace } from "@/lib/auth/session";
import { schemaDateIso } from "@/lib/formulaires/dates";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { lireNombre } from "@/lib/formulaires/nombres";
import { avecSucces } from "@/lib/formulaires/succes";
import { analyserImport, cleDoublon } from "@/lib/import/collage";
import { calculerBulletin } from "@/lib/metier/rh";
import { DOUBLON_EMPLOYE, chargerImportEmployes } from "@/lib/rh/import";
import { finMois } from "@/lib/rh/libelles";
import { chargerReglesPaie, elementsVariables } from "@/lib/rh/paie";
import { clientServeur } from "@/lib/supabase/serveur";

const uuid = (m: string) => z.string().regex(/^[0-9a-f-]{36}$/i, m);
const uuidFacultatif = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v : null))
  .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), "Choix invalide.");
const date = (m: string) => z.string().regex(schemaDateIso, m);
const dateFacultative = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v : null))
  .refine((v) => v === null || schemaDateIso.test(v), "Date invalide.");
const montant = z
  .string()
  .optional()
  .transform((t) => (t && t.trim() ? lireNombre(t) : 0))
  .refine((n): n is number => n !== null && n >= 0 && Number.isInteger(n), "Montant entier en GNF.");

function rafraichir() {
  revalidatePath("/rh", "layout");
}

// -----------------------------------------------------------------------------
// Employés
// -----------------------------------------------------------------------------
/**
 * « Coller depuis Excel » : le texte collé est relu ici avec les listes de la base (même analyse que l'aperçu),
 * et seules les lignes sans erreur sont créées, en une fois. Les employés déjà présents sont refusés.
 */
export async function importerEmployes(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const supabase = await clientServeur();
  const { colonnes, existants } = await chargerImportEmployes(supabase);
  const r = analyserImport(String(fd.get("texte") ?? ""), colonnes, { doublon: cleDoublon(DOUBLON_EMPLOYE), existants: new Set(existants) });
  if (!r.valides.length) return { message: "Aucune ligne prête : corrigez les lignes en rouge, puis recollez-les." };
  const { error } = await supabase.from("employes").insert(
    r.valides.map(({ valeurs: v }) => ({
      nom: String(v.nom),
      prenom: String(v.prenom ?? ""),
      sexe: (v.sexe as string | null) ?? null,
      telephone: String(v.telephone ?? ""),
      departement_id: (v.departement_id as string | null) ?? null,
      fonction_id: (v.fonction_id as string | null) ?? null,
      type_contrat_id: (v.type_contrat_id as string | null) ?? null,
      date_embauche: String(v.date_embauche),
      salaire_base_gnf: Number(v.salaire_base_gnf ?? 0),
      numero_cnss: String(v.numero_cnss ?? ""),
    })),
  );
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  const reste = r.lignes.length - r.valides.length;
  return { ok: true, message: `${r.valides.length} employé(s) créé(s), avec leur matricule.${reste ? ` ${reste} ligne(s) en erreur non créée(s).` : ""}` };
}

const schemaEmploye = z
  .object({
    nom: z.string().trim().min(1, "Nom obligatoire.").max(60),
    prenom: z.string().trim().max(60).default(""),
    sexe: z
      .string()
      .optional()
      .transform((v) => (v === "F" || v === "M" ? v : null)),
    date_naissance: dateFacultative,
    telephone: z.string().trim().max(30).default(""),
    adresse: z.string().trim().max(200).default(""),
    departement_id: uuidFacultatif,
    fonction_id: uuidFacultatif,
    type_contrat_id: uuidFacultatif,
    date_embauche: date("Date d'embauche obligatoire."),
    date_fin_contrat: dateFacultative,
    salaire_base_gnf: montant,
    numero_cnss: z.string().trim().max(30).default(""),
    mode_paiement: z.enum(["especes", "banque", "mobile"]),
    compte_paiement: z.string().trim().max(60).default(""),
    notes: z.string().trim().max(1000).default(""),
  })
  .superRefine((d, ctx) => {
    if (d.date_fin_contrat && d.date_fin_contrat < d.date_embauche) ctx.addIssue({ code: "custom", path: ["date_fin_contrat"], message: "La fin du contrat est avant l'embauche." });
  });

export async function enregistrerEmploye(id: string | null, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaEmploye.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  if (!id) {
    const { data, error } = await supabase.from("employes").insert(lecture.data).select("id, matricule").single();
    if (error) return { message: messageErreurBase(error), valeurs };
    rafraichir();
    redirect(avecSucces(`/rh/employes/${data.id}`, `Employé créé : matricule ${data.matricule}.`));
  }
  const { error } = await supabase.from("employes").update(lecture.data).eq("id", id);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Dossier enregistré." };
}

const schemaSortie = z.object({
  date_sortie: date("Date de sortie obligatoire."),
  motif_sortie: z.string().trim().min(2, "Indiquez le motif (démission, fin de contrat, licenciement…).").max(200),
});

export async function enregistrerSortie(id: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaSortie.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("employes").update(lecture.data).eq("id", id);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  redirect(avecSucces(`/rh/employes/${id}`, "Sortie enregistrée : l'employé n'apparaît plus dans les présences ni la paie."));
}

// -----------------------------------------------------------------------------
// Présences : une feuille par jour (tous les employés actifs)
// -----------------------------------------------------------------------------
const STATUTS = ["present", "retard", "absent", "conge", "repos"] as const;

export async function enregistrerPresences(jour: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  if (!schemaDateIso.test(jour)) return { message: "Date invalide." };
  const lignes: { employe_id: string; jour: string; statut: (typeof STATUTS)[number]; heures_sup: number; note: string }[] = [];
  const erreurs: Record<string, string> = {};
  for (const [cle, valeur] of fd.entries()) {
    if (!cle.startsWith("statut_") || typeof valeur !== "string" || !valeur) continue;
    const employe = cle.slice("statut_".length);
    if (!/^[0-9a-f-]{36}$/i.test(employe) || !STATUTS.includes(valeur as (typeof STATUTS)[number])) continue;
    const hs = lireNombre(String(fd.get(`hs_${employe}`) ?? "")) ?? 0;
    if (hs < 0 || hs > 24) {
      erreurs[`hs_${employe}`] = "Entre 0 et 24 h.";
      continue;
    }
    lignes.push({ employe_id: employe, jour, statut: valeur as (typeof STATUTS)[number], heures_sup: hs, note: String(fd.get(`note_${employe}`) ?? "").slice(0, 200) });
  }
  if (Object.keys(erreurs).length) return { erreurs, message: "Corrigez les heures supplémentaires en rouge." };
  if (!lignes.length) return { message: "Rien à enregistrer : choisissez au moins un statut." };
  const supabase = await clientServeur();
  const { error } = await supabase.from("presences").upsert(lignes, { onConflict: "employe_id,jour" });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: `Feuille enregistrée : ${lignes.length} employé(s).` };
}

// -----------------------------------------------------------------------------
// Congés et absences
// -----------------------------------------------------------------------------
const schemaAbsence = z
  .object({
    employe_id: uuid("Choisissez l'employé."),
    type_absence_id: uuid("Choisissez le type d'absence."),
    du: date("Date de début obligatoire."),
    au: date("Date de fin obligatoire."),
    motif: z.string().trim().max(300).default(""),
  })
  .superRefine((d, ctx) => {
    if (d.au < d.du) ctx.addIssue({ code: "custom", path: ["au"], message: "La fin est avant le début." });
  });

export async function creerAbsence(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaAbsence.safeParse(valeurs);
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const supabase = await clientServeur();
  const { error } = await supabase.from("absences").insert({ ...lecture.data, statut: fd.get("approuver") === "1" ? "approuvee" : "demandee" });
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  // Le jeton vide le formulaire après chaque enregistrement réussi.
  return { ok: true, message: fd.get("approuver") === "1" ? "Absence enregistrée et approuvée." : "Demande enregistrée : à décider.", valeurs: { jeton: crypto.randomUUID() } };
}

export async function deciderAbsence(id: string, decision: "approuvee" | "refusee"): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const supabase = await clientServeur();
  const { error } = await supabase.from("absences").update({ statut: decision }).eq("id", id).eq("statut", "demandee");
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  return { ok: true, message: decision === "approuvee" ? "Approuvée." : "Refusée." };
}

// -----------------------------------------------------------------------------
// Paie
// -----------------------------------------------------------------------------
/** Prépare (ou recalcule) les bulletins du mois pour tous les employés présents dans le mois. Primes et avances déjà saisies sont gardées. */
export async function preparerPaie(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const saisie = String(fd.get("mois") ?? "");
  if (!/^\d{4}-\d{2}$/.test(saisie)) return { erreurs: { mois: "Choisissez le mois." }, valeurs: { mois: saisie } };
  const mois = `${saisie}-01`;
  const fin = finMois(mois);
  const supabase = await clientServeur();
  const { data: periode } = await supabase.from("periodes_paie").select("statut").eq("mois", mois).maybeSingle();
  if (periode?.statut === "validee") return { message: "La paie de ce mois est déjà validée." };
  if (!periode) {
    const { error } = await supabase.from("periodes_paie").insert({ mois });
    if (error) return { message: messageErreurBase(error) };
  }
  const [regles, variables, { data: employes }, { data: existants }] = await Promise.all([
    chargerReglesPaie(),
    elementsVariables(mois),
    supabase.from("employes").select("id, salaire_base_gnf, date_embauche, date_sortie").lte("date_embauche", fin),
    supabase.from("bulletins").select("employe_id, primes_gnf, avances_gnf").eq("mois", mois),
  ]);
  const deja = new Map((existants ?? []).map((b) => [b.employe_id, b]));
  const lignes = (employes ?? [])
    .filter((e) => !e.date_sortie || e.date_sortie >= mois)
    .map((e) => {
      const v = variables.get(e.id) ?? { heuresSup: 0, joursAbsenceNonPayee: 0 };
      const primes = Number(deja.get(e.id)?.primes_gnf ?? 0);
      const avances = Number(deja.get(e.id)?.avances_gnf ?? 0);
      const b = calculerBulletin({ salaireBaseGnf: Number(e.salaire_base_gnf), primesGnf: primes, heuresSup: v.heuresSup, joursAbsenceNonPayee: v.joursAbsenceNonPayee, avancesGnf: avances }, regles);
      return {
        mois,
        employe_id: e.id,
        salaire_base_gnf: Number(e.salaire_base_gnf),
        primes_gnf: primes,
        heures_sup: v.heuresSup,
        montant_heures_sup_gnf: b.montantHeuresSupGnf,
        jours_absence_non_payee: v.joursAbsenceNonPayee,
        retenue_absences_gnf: b.retenueAbsencesGnf,
        avances_gnf: avances,
        brut_gnf: b.brutGnf,
        cnss_salarie_gnf: b.cnssSalarieGnf,
        cnss_employeur_gnf: b.cnssEmployeurGnf,
        rts_gnf: b.rtsGnf,
        net_gnf: b.netGnf,
      };
    });
  if (!lignes.length) return { message: "Aucun employé à payer pour ce mois." };
  const { error } = await supabase.from("bulletins").upsert(lignes, { onConflict: "mois,employe_id" });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/rh/paie/${saisie}`, `${lignes.length} bulletin(s) calculé(s) à partir des présences et des absences.`));
}

/** Modifie primes et avances d'un bulletin (paie non validée) et recalcule ses montants. */
export async function modifierBulletin(id: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const valeurs = valeursFormulaire(fd);
  const primes = montant.safeParse(valeurs.primes_gnf);
  const avances = montant.safeParse(valeurs.avances_gnf);
  if (!primes.success || !avances.success) return { erreurs: { ...(primes.success ? {} : { primes_gnf: "Montant entier." }), ...(avances.success ? {} : { avances_gnf: "Montant entier." }) }, valeurs };
  const supabase = await clientServeur();
  const [{ data: b }, regles] = await Promise.all([supabase.from("bulletins").select("*").eq("id", id).maybeSingle(), chargerReglesPaie()]);
  if (!b) return { message: "Bulletin introuvable." };
  const c = calculerBulletin({ salaireBaseGnf: Number(b.salaire_base_gnf), primesGnf: primes.data, heuresSup: Number(b.heures_sup), joursAbsenceNonPayee: Number(b.jours_absence_non_payee), avancesGnf: avances.data }, regles);
  const { error } = await supabase
    .from("bulletins")
    .update({ primes_gnf: primes.data, avances_gnf: avances.data, montant_heures_sup_gnf: c.montantHeuresSupGnf, retenue_absences_gnf: c.retenueAbsencesGnf, brut_gnf: c.brutGnf, cnss_salarie_gnf: c.cnssSalarieGnf, cnss_employeur_gnf: c.cnssEmployeurGnf, rts_gnf: c.rtsGnf, net_gnf: c.netGnf })
    .eq("id", id);
  if (error) return { message: messageErreurBase(error), valeurs };
  rafraichir();
  return { ok: true, message: "Recalculé." };
}

export async function validerPaie(mois: string): Promise<EtatFormulaire> {
  await exigerEspace("rh");
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("valider_paie", { p_mois: mois });
  if (error) return { message: messageErreurBase(error) };
  rafraichir();
  redirect(avecSucces(`/rh/paie/${mois.slice(0, 7)}`, "Paie validée : les bulletins sont figés."));
}
