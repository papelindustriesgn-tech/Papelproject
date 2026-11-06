"use server";

import { hasServiceRole } from "@/lib/env";
import { ipHash, isRateLimited } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { contactSchema, isLikelyBot, leadSchema } from "@/lib/validation";

export type FormResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

type AntiBot = { website?: string; startedAt?: number };

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const UNAVAILABLE: FormResult = {
  ok: false,
  error: "Le service d'envoi est momentanément indisponible. Merci de réessayer plus tard ou de nous contacter par WhatsApp.",
};

export async function submitLead(input: unknown, antiBot: AntiBot, sourcePath?: string): Promise<FormResult> {
  // Robot : on répond « succès » sans rien enregistrer.
  if (isLikelyBot(antiBot)) return { ok: true };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (!hasServiceRole()) return UNAVAILABLE;

  const db = createServiceClient();
  const hash = await ipHash();
  if (await isRateLimited(db, "leads", hash)) {
    return { ok: false, error: "Vous avez déjà envoyé plusieurs demandes. Notre équipe revient vers vous rapidement." };
  }

  const v = parsed.data;
  const { error } = await db.from("leads").insert({
    full_name: v.full_name,
    company: v.company || null,
    city: v.city,
    whatsapp: v.whatsapp,
    email: v.email ?? null,
    activity_type: v.activity_type,
    products_wanted: v.products_wanted.filter(Boolean),
    estimated_volume: v.estimated_volume || null,
    message: v.message || null,
    request_type: v.request_type,
    source_path: sourcePath?.slice(0, 200) ?? null,
    ip_hash: hash,
  });
  if (error) {
    console.error("[lead] insertion impossible", error.message);
    return UNAVAILABLE;
  }
  return { ok: true };
}

export async function submitContact(input: unknown, antiBot: AntiBot): Promise<FormResult> {
  if (isLikelyBot(antiBot)) return { ok: true };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  if (!hasServiceRole()) return UNAVAILABLE;

  const db = createServiceClient();
  const hash = await ipHash();
  if (await isRateLimited(db, "contact_messages", hash)) {
    return { ok: false, error: "Vous avez déjà envoyé plusieurs messages. Notre équipe revient vers vous rapidement." };
  }
  const v = parsed.data;
  const { error } = await db.from("contact_messages").insert({
    full_name: v.full_name,
    phone: v.phone ?? null,
    email: v.email ?? null,
    subject: v.subject,
    message: v.message,
    ip_hash: hash,
  });
  if (error) {
    console.error("[contact] insertion impossible", error.message);
    return UNAVAILABLE;
  }
  return { ok: true };
}
