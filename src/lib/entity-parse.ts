import "server-only";
import { z } from "zod";
import type { FieldSpec } from "@/lib/admin-entities";
import type { City } from "@/lib/cities";
import { safeImage } from "@/lib/images";

const HOST_ERROR = "Image refusée : utilise « Ajouter » (stockage Uny) ou une URL images.unsplash.com.";

type Parsed = { values?: Record<string, unknown>; error?: string };

/** Lit et valide un champ de formulaire (admin et espace partenaire). */
export function parseField(f: FieldSpec, formData: FormData, cities: City[]): Parsed {
  if (f.type === "location") {
    const cityRaw = String(formData.get(`${f.name}__city`) ?? "").trim();
    const districtRaw = String(formData.get(`${f.name}__district`) ?? "").trim();
    const values: Record<string, unknown> = {};
    if (!cityRaw) {
      if (f.required) return { error: "Choisis une ville" };
      values.city_id = null;
    } else {
      const city = cities.find((c) => String(c.id) === cityRaw);
      if (!city) return { error: "Ville invalide" };
      values.city_id = city.id;
    }
    if (f.district !== false) {
      if (!districtRaw && f.districtRequired) return { error: "Indique le quartier" };
      if (districtRaw.length > 80) return { error: "Quartier trop long" };
      values.district = districtRaw || null;
    }
    return { values };
  }

  const raw = formData.get(f.name);
  const one = (value: unknown): Parsed => ({ values: { [f.name]: value } });
  const s = typeof raw === "string" ? raw.trim() : "";
  const required = "required" in f && f.required;
  switch (f.type) {
    case "checkbox":
      return one(raw === "on");
    case "number": {
      if (!s) return required ? { error: "Champ requis" } : one(null);
      const n = Number(s);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return { error: "Nombre invalide" };
      if (f.min !== undefined && n < f.min) return { error: `Minimum ${f.min}` };
      if (f.max !== undefined && n > f.max) return { error: `Maximum ${f.max}` };
      return one(n);
    }
    case "date":
      if (!s) return required ? { error: "Champ requis" } : one(null);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? one(s) : { error: "Date invalide" };
    case "tags":
      return one(
        s
          ? s
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 20)
          : [],
      );
    case "images": {
      try {
        const arr = z
          .array(z.url())
          .max(f.max ?? 8)
          .parse(JSON.parse(s || "[]"));
        if (arr.some((u) => !safeImage(u))) return { error: HOST_ERROR };
        return one(arr);
      } catch {
        return { error: "Photos invalides" };
      }
    }
    case "image":
      if (!s) return one(null);
      return safeImage(s) ? one(s) : { error: HOST_ERROR };
    case "select":
      if (!s) return required ? { error: "Champ requis" } : one(null);
      if (Array.isArray(f.options) && !f.options.some((o) => o.value === s)) return { error: "Valeur invalide" };
      if (f.options === "partners" && !z.uuid().safeParse(s).success) return { error: "Partenaire invalide" };
      return one(s);
    default: {
      if (!s) return required ? { error: "Champ requis" } : one(null);
      if ("max" in f && f.max && s.length > f.max) return { error: `${f.max} caractères maximum` };
      if ("digits" in f && f.digits) {
        const d = s.replace(/\s/g, "");
        if (!/^\d+$/.test(d) || d.length < f.digits.min || d.length > f.digits.max)
          return { error: `Chiffres uniquement (${f.digits.min} à ${f.digits.max})` };
        return one(d);
      }
      if (f.type === "url" && !z.url().safeParse(s).success) return { error: "URL invalide (https://…)" };
      if (f.type === "email" && !z.email().safeParse(s).success) return { error: "Email invalide" };
      return one(s);
    }
  }
}

/** Valide tous les champs ; renvoie la ligne à enregistrer ou les erreurs par champ. */
export function parseFields(fields: FieldSpec[], formData: FormData, cities: City[]) {
  const row: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};
  for (const f of fields) {
    const r = parseField(f, formData, cities);
    if (r.error) fieldErrors[f.name] = r.error;
    else Object.assign(row, r.values);
  }
  // Prix promo : toujours inférieur au prix de référence
  const lower = (low: string, high: string) => {
    if (typeof row[low] === "number" && typeof row[high] === "number" && (row[low] as number) >= (row[high] as number))
      fieldErrors[low === "promo_price_gnf" ? low : high] = "Le prix promo doit être inférieur au prix normal";
  };
  lower("promo_price_gnf", "price_gnf");
  lower("price_gnf", "original_price_gnf");
  // Champs texte non nulls en base
  for (const k of ["description", "conditions"]) if (k in row && row[k] === null) row[k] = "";
  return { row, fieldErrors };
}
