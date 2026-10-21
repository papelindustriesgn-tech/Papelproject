"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUniversity, universityCan, UNIVERSITY_ROLES, type UniversityRole } from "@/lib/university";
import type { FormState } from "@/lib/actions/types";

const ROLE = z.enum(Object.keys(UNIVERSITY_ROLES) as [UniversityRole, ...UniversityRole[]]);

async function guard() {
  const ctx = await requireUniversity();
  if (!universityCan(ctx.university, "manage")) return null;
  return ctx;
}

/** Ajoute un membre : la personne doit déjà avoir un compte Uny (aucun compte n'est créé à son insu). */
export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await guard();
  if (!ctx) return { error: "Réservé aux administrateurs de l'établissement." };
  const parsed = z.object({ email: z.email("Email invalide").max(200), role: ROLE }).safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Vérifiez l'email et le rôle.", values: { email: String(formData.get("email") ?? "") } };
  const admin = createAdminClient();
  const { data: user } = await admin
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (!user)
    return {
      error:
        "Aucun compte Uny avec cet email. La personne crée d'abord son compte (Connexion → Établissement), puis vous l'ajoutez.",
      values: { email: parsed.data.email },
    };
  if (user.role === "student")
    return {
      error: "Ce compte est un compte étudiant : utilisez une adresse professionnelle dédiée.",
      values: { email: parsed.data.email },
    };
  const { error } = await admin.from("university_members").upsert({
    university_id: ctx.university.id,
    user_id: user.id,
    role: parsed.data.role,
    invited_by: ctx.profile.id,
  });
  if (error) return { error: "Ajout impossible. Réessayez." };
  await admin.from("audit_log").insert({
    actor_id: ctx.profile.id,
    university_id: ctx.university.id,
    subject_id: user.id,
    action: "member.added",
    details: { role: parsed.data.role },
  });
  revalidatePath("/universite/equipe");
  return { ok: true, message: `${user.first_name} ${user.last_name} a été ajouté(e) ✅` };
}

async function adminCount(universityId: number) {
  const { count } = await createAdminClient()
    .from("university_members")
    .select("user_id", { count: "exact", head: true })
    .eq("university_id", universityId)
    .eq("role", "admin");
  return count ?? 0;
}

export async function changeMemberRole(userId: string, role: string): Promise<{ error?: string }> {
  const ctx = await guard();
  if (!ctx) return { error: "Réservé aux administrateurs de l'établissement." };
  if (!z.uuid().safeParse(userId).success || !ROLE.safeParse(role).success) return { error: "Demande invalide." };
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("university_members")
    .select("role")
    .eq("university_id", ctx.university.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!current) return { error: "Membre introuvable." };
  if (current.role === "admin" && role !== "admin" && (await adminCount(ctx.university.id)) <= 1)
    return { error: "Il faut au moins un administrateur dans l'établissement." };
  await admin.from("university_members").update({ role }).eq("university_id", ctx.university.id).eq("user_id", userId);
  await admin.from("audit_log").insert({
    actor_id: ctx.profile.id,
    university_id: ctx.university.id,
    subject_id: userId,
    action: "member.role_changed",
    details: { role, previous: current.role },
  });
  revalidatePath("/universite/equipe");
  return {};
}

export async function removeMember(userId: string): Promise<{ error?: string }> {
  const ctx = await guard();
  if (!ctx) return { error: "Réservé aux administrateurs de l'établissement." };
  if (!z.uuid().safeParse(userId).success) return { error: "Demande invalide." };
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("university_members")
    .select("role")
    .eq("university_id", ctx.university.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!current) return { error: "Membre introuvable." };
  if (current.role === "admin" && (await adminCount(ctx.university.id)) <= 1)
    return { error: "Il faut au moins un administrateur dans l'établissement." };
  await admin.from("university_members").delete().eq("university_id", ctx.university.id).eq("user_id", userId);
  await admin.from("audit_log").insert({
    actor_id: ctx.profile.id,
    university_id: ctx.university.id,
    subject_id: userId,
    action: "member.removed",
    details: { role: current.role },
  });
  revalidatePath("/universite/equipe");
  return {};
}
