"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/queries";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ENTITIES, isEntity, type EntityKey, type FieldSpec } from "@/lib/admin-entities";
import { formValues, type FormState } from "@/lib/actions/types";

function parseField(f: FieldSpec, raw: FormDataEntryValue | null): { value?: unknown; error?: string } {
  const s = typeof raw === "string" ? raw.trim() : "";
  const required = "required" in f && f.required;
  switch (f.type) {
    case "checkbox":
      return { value: raw === "on" };
    case "number": {
      if (!s) return required ? { error: "Champ requis" } : { value: null };
      const n = Number(s);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return { error: "Nombre invalide" };
      if (f.min !== undefined && n < f.min) return { error: `Minimum ${f.min}` };
      if (f.max !== undefined && n > f.max) return { error: `Maximum ${f.max}` };
      return { value: n };
    }
    case "date":
      if (!s) return required ? { error: "Champ requis" } : { value: null };
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { value: s } : { error: "Date invalide" };
    case "tags":
      return { value: s ? s.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20) : [] };
    case "images": {
      try {
        const arr = z.array(z.url()).max(f.max ?? 8).parse(JSON.parse(s || "[]"));
        return { value: arr };
      } catch {
        return { error: "Photos invalides" };
      }
    }
    case "image":
      if (!s) return { value: null };
      return z.url().safeParse(s).success ? { value: s } : { error: "URL invalide" };
    case "select":
      if (!s) return required ? { error: "Champ requis" } : { value: null };
      if (Array.isArray(f.options) && !f.options.some((o) => o.value === s)) return { error: "Valeur invalide" };
      if (f.options === "partners" && !z.uuid().safeParse(s).success) return { error: "Partenaire invalide" };
      return { value: s };
    default: {
      if (!s) return required ? { error: "Champ requis" } : { value: null };
      if ("max" in f && f.max && s.length > f.max) return { error: `${f.max} caractères maximum` };
      if (f.type === "url" && !z.url().safeParse(s).success) return { error: "URL invalide (https://…)" };
      if (f.type === "email" && !z.email().safeParse(s).success) return { error: "Email invalide" };
      return { value: s };
    }
  }
}

export async function saveEntity(entity: EntityKey, id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isEntity(entity)) return { error: "Entité inconnue" };
  const cfg = ENTITIES[entity];
  const row: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};
  for (const f of cfg.fields) {
    const r = parseField(f, formData.get(f.name));
    if (r.error) fieldErrors[f.name] = r.error;
    else row[f.name] = r.value;
  }
  // Champs texte non nulls en base
  for (const k of ["description", "conditions"]) if (k in row && row[k] === null) row[k] = "";
  if (Object.keys(fieldErrors).length) return { error: "Vérifie les champs indiqués.", fieldErrors, values: formValues(formData) };

  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("id").eq("slug", "conakry").single();
  if (!id) row.city_id = city?.id ?? null;

  const table = supabase.from(cfg.table);
  const res = id
    ? await table.update(row as never).eq("id", id).select("id").single()
    : await table.insert(row as never).select("id").single();
  if (res.error) return { error: `Enregistrement impossible : ${res.error.message}`, values: formValues(formData) };

  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/${entity}`);
  revalidatePath("/", "layout");
  redirect(`/admin/${entity}?enregistre=1`);
}

export async function deleteEntity(entity: EntityKey, id: string) {
  await requireAdmin();
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from(ENTITIES[entity].table).delete().eq("id", id);
  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/${entity}`);
  revalidatePath("/", "layout");
  redirect(`/admin/${entity}?supprime=1`);
}

export async function toggleEntity(entity: EntityKey, id: string, active: boolean) {
  await requireAdmin();
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from(ENTITIES[entity].table).update({ is_active: active } as never).eq("id", id);
  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/${entity}`);
  revalidatePath("/", "layout");
}
