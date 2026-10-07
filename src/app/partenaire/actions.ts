"use server";

import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_TAG } from "@/lib/queries";
import { getCities } from "@/lib/cities";
import { parseFields } from "@/lib/entity-parse";
import { formValues, type FormState } from "@/lib/actions/types";
import { PARTNER_COOKIE, requirePartner } from "@/lib/partner";
import { isPartnerKind, PARTNER_ENTITIES, type PartnerKind } from "@/lib/partner-entities";
import { ENTITIES } from "@/lib/admin-entities";
import { normalizeUnyId, UNY_ID_EXAMPLE } from "@/lib/uny-id";

function refresh(kind?: PartnerKind) {
  updateTag(CONTENT_TAG);
  revalidatePath("/partenaire", "layout");
  if (kind) revalidatePath(`/partenaire/${kind}`);
}

export async function savePartnerEntity(
  kind: PartnerKind,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isPartnerKind(kind)) return { error: "Rubrique inconnue" };
  if (id && !z.uuid().safeParse(id).success) return { error: "Élément introuvable" };
  const { partner } = await requirePartner();
  const cfg = PARTNER_ENTITIES[kind];
  const { row, fieldErrors } = parseFields(cfg.fields, formData, await getCities());
  if (Object.keys(fieldErrors).length)
    return { error: "Vérifie les champs indiqués.", fieldErrors, values: formValues(formData) };

  const supabase = await createClient();
  row.partner_id = partner.id;
  if (kind === "jobs") {
    row.company_name = partner.name;
    row.logo_url = partner.logo_url;
  }

  let savedId = id;
  if (kind === "boutique") {
    const images = (row.images as string[]) ?? [];
    delete row.images;
    const res = id
      ? await supabase
          .from("marketplace_items")
          .update(row as never)
          .eq("id", id)
          .eq("partner_id", partner.id)
          .select("id")
          .single()
      : await supabase
          .from("marketplace_items")
          .insert(row as never)
          .select("id")
          .single();
    if (res.error) return { error: `Enregistrement impossible : ${res.error.message}`, values: formValues(formData) };
    savedId = res.data.id;
    await supabase.from("marketplace_images").delete().eq("item_id", savedId);
    if (images.length) {
      const { error } = await supabase
        .from("marketplace_images")
        .insert(images.map((url, position) => ({ item_id: savedId!, url, position })));
      if (error) return { error: "Photos refusées : utilise le bouton « Ajouter ».", values: formValues(formData) };
    }
  } else {
    const table = supabase.from(cfg.table);
    const res = id
      ? await table
          .update(row as never)
          .eq("id", id)
          .eq("partner_id", partner.id)
          .select("id")
          .single()
      : await table
          .insert(row as never)
          .select("id")
          .single();
    if (res.error) return { error: `Enregistrement impossible : ${res.error.message}`, values: formValues(formData) };
  }

  refresh(kind);
  redirect(`/partenaire/${kind}?enregistre=1`);
}

export async function togglePartnerEntity(kind: PartnerKind, id: string, active: boolean) {
  if (!isPartnerKind(kind) || !z.uuid().safeParse(id).success) return;
  const { partner } = await requirePartner();
  const supabase = await createClient();
  if (kind === "boutique") {
    await supabase
      .from("marketplace_items")
      .update({ status: active ? "active" : "hidden" })
      .eq("id", id)
      .eq("partner_id", partner.id);
  } else {
    await supabase
      .from(PARTNER_ENTITIES[kind].table)
      .update({ is_active: active } as never)
      .eq("id", id)
      .eq("partner_id", partner.id);
  }
  refresh(kind);
}

export async function deletePartnerEntity(kind: PartnerKind, id: string) {
  if (!isPartnerKind(kind) || !z.uuid().safeParse(id).success) return;
  const { partner } = await requirePartner();
  const supabase = await createClient();
  await supabase.from(PARTNER_ENTITIES[kind].table).delete().eq("id", id).eq("partner_id", partner.id);
  refresh(kind);
  redirect(`/partenaire/${kind}?supprime=1`);
}

// -----------------------------------------------------------------------------
// Validation d'une carte étudiante (scan du QR code ou numéro Uny)
// -----------------------------------------------------------------------------
export type ValidationResult = {
  found: boolean;
  outcome?: "valid" | "unverified" | "expired" | "revoked";
  eligible?: boolean;
  uny_id?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  university?: string | null;
  field_of_study?: string | null;
  academic_year?: string;
  expires_at?: string;
  deal_title?: string | null;
  deal_requires_verification?: boolean;
  uses_today?: number;
};
export type ValidateState = { result?: ValidationResult; error?: string; at?: number };

/** Extrait le jeton du QR code (lien …/v/<jeton>) ou le numéro Uny (UNY-GN-2026-7K3QXN ou GN-2026-000145). */
function parseCode(raw: string): { token?: string; unyId?: string } | null {
  const s = raw.trim();
  const fromUrl = s.match(/\/v\/([0-9a-f]{20,64})(?:[/?#]|$)/i);
  if (fromUrl) return { token: fromUrl[1].toLowerCase() };
  if (/^[0-9a-f]{20,64}$/i.test(s)) return { token: s.toLowerCase() };
  const unyId = normalizeUnyId(s);
  return unyId ? { unyId } : null;
}

export async function validateCard(_prev: ValidateState, formData: FormData): Promise<ValidateState> {
  const { partner } = await requirePartner();
  const code = parseCode(String(formData.get("code") ?? ""));
  if (!code)
    return {
      error: `Code non reconnu. Scanne le QR code de la carte Uny ou tape le numéro (ex. ${UNY_ID_EXAMPLE}).`,
      at: Date.now(),
    };
  const deal = String(formData.get("deal_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_validate_card", {
    p_partner: partner.id,
    p_token: code.token,
    p_uny_id: code.unyId,
    p_deal: z.uuid().safeParse(deal).success ? deal : undefined,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Vérification impossible. Réessaie.", at: Date.now() };
  revalidatePath("/partenaire");
  return { result: data as ValidationResult, at: Date.now() };
}

// -----------------------------------------------------------------------------
// Fiche du partenaire
// -----------------------------------------------------------------------------
const PROFILE_FIELDS = ENTITIES.partenaires.fields.filter((f) => !["is_active", "is_demo"].includes(f.name));

export async function updatePartnerProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { partner } = await requirePartner();
  const { row, fieldErrors } = parseFields(PROFILE_FIELDS, formData, await getCities());
  if (Object.keys(fieldErrors).length)
    return { error: "Vérifie les champs indiqués.", fieldErrors, values: formValues(formData) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update(row as never)
    .eq("id", partner.id);
  if (error) return { error: "Enregistrement impossible.", values: formValues(formData) };
  // Les offres d'emploi affichent le nom et le logo du partenaire
  await supabase
    .from("jobs")
    .update({ company_name: row.name as string, logo_url: (row.logo_url as string | null) ?? null })
    .eq("partner_id", partner.id);
  refresh();
  return { ok: true, message: "Fiche mise à jour ✅" };
}

export async function switchPartner(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  (await cookies()).set(PARTNER_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/partenaire", "layout");
}
