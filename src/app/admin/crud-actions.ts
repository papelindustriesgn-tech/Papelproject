"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/queries";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ENTITIES, isEntity, type EntityKey } from "@/lib/admin-entities";
import { formValues, type FormState } from "@/lib/actions/types";
import { parseFields } from "@/lib/entity-parse";
import { getCities } from "@/lib/cities";

export async function saveEntity(entity: EntityKey, id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isEntity(entity)) return { error: "Entité inconnue" };
  const cfg = ENTITIES[entity];
  const { row, fieldErrors } = parseFields(cfg.fields, formData, await getCities());
  if (Object.keys(fieldErrors).length)
    return { error: "Vérifie les champs indiqués.", fieldErrors, values: formValues(formData) };

  const supabase = await createClient();

  const table = supabase.from(cfg.table);
  const res = id
    ? await table
        .update(row as never)
        .eq("id", id)
        .select("id")
        .single()
    : await table
        .insert(row as never)
        .select("id")
        .single();
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
  await supabase
    .from(ENTITIES[entity].table)
    .update({ is_active: active } as never)
    .eq("id", id);
  updateTag(CONTENT_TAG);
  revalidatePath(`/admin/${entity}`);
  revalidatePath("/", "layout");
}
