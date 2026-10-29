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
import { syncOnlineAccess, takeOnlineAccess } from "@/lib/deal-online";

export async function saveEntity(entity: EntityKey, id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isEntity(entity)) return { error: "Entité inconnue" };
  const cfg = ENTITIES[entity];
  const { row, fieldErrors } = parseFields(cfg.fields, formData, await getCities());
  if (Object.keys(fieldErrors).length)
    return { error: "Vérifie les champs indiqués.", fieldErrors, values: formValues(formData) };

  const supabase = await createClient();
  const online = cfg.table === "deals" ? takeOnlineAccess(row) : null;

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
  if (online) {
    const sync = await syncOnlineAccess(supabase, res.data.id, row.channel, online);
    if (sync.error) return { error: "Offre enregistrée, mais le lien en ligne n'a pas pu l'être.", values: formValues(formData) };
  }

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
