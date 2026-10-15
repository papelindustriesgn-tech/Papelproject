import "server-only";
import type { Database } from "@/lib/database.types";
import { normalizeName, type MatchCriteria } from "@/lib/verification/normalize";

/**
 * Connecteurs « université » (niveau 1 — API). Ajouter une université ne demande aucun code :
 * l'administrateur Uny renseigne l'URL, le nom de la variable d'environnement qui contient la clé
 * et la référence de l'accord signé. Un nouveau format d'API = un nouveau connecteur dans CONNECTORS.
 *
 * Règles : HTTPS uniquement, pas de redirection, délai de 8 s, clé lue côté serveur seulement,
 * aucune donnée de la source conservée hormis le résultat du rapprochement et une référence.
 */

export type IntegrationRow = Database["public"]["Tables"]["university_integrations"]["Row"];

export type VerificationInput = {
  studentNumber: string;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  academicYear: string;
};

export type ConnectorResult =
  | {
      kind: "answer";
      found: boolean;
      enrolled: boolean;
      criteria: MatchCriteria;
      reference: string | null;
      academic: { faculty?: string; department?: string; program?: string; study_level?: string };
    }
  | { kind: "error"; message: string };

export type UniversityConnector = {
  key: IntegrationRow["provider"];
  label: string;
  description: string;
  verify(cfg: IntegrationRow, input: VerificationInput): Promise<ConnectorResult>;
  test(cfg: IntegrationRow): Promise<{ ok: boolean; message: string }>;
};

const TIMEOUT_MS = 8000;

function secretFor(cfg: IntegrationRow) {
  if (!cfg.secret_ref) return null;
  return process.env[cfg.secret_ref] ?? null;
}

function authHeaders(cfg: IntegrationRow): Record<string, string> | null {
  const secret = secretFor(cfg);
  if (!secret) return null;
  return cfg.auth_type === "api_key_header" ? { "X-API-Key": secret } : { Authorization: `Bearer ${secret}` };
}

function url(cfg: IntegrationRow, path: string) {
  const base = new URL(cfg.base_url!);
  if (base.protocol !== "https:") throw new Error("HTTPS obligatoire");
  return new URL(path.replace(/^\//, ""), base.href.endsWith("/") ? base.href : `${base.href}/`);
}

const mapping = (cfg: IntegrationRow) => (cfg.field_mapping ?? {}) as Record<string, string>;
const pick = (obj: Record<string, unknown>, path: string | undefined) =>
  path
    ? path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj)
    : undefined;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined);

/**
 * REST/JSON générique.
 *   POST {base_url}/{verify_path}  { student_number, last_name, first_name, birth_date, academic_year }
 *   → { found, enrolled, last_name?, first_name?, birth_date?, faculty?, program?, level?, reference? }
 * Les noms des champs de la réponse se règlent dans field_mapping (ex. { "enrolled": "data.inscrit" }).
 */
const restJsonV1: UniversityConnector = {
  key: "rest_json_v1",
  label: "API REST / JSON",
  description: "L'université expose un service HTTPS qui confirme l'inscription d'un matricule.",

  async verify(cfg, input) {
    const headers = authHeaders(cfg);
    if (!headers || !cfg.base_url) return { kind: "error", message: "Connecteur incomplet (URL ou clé absente du serveur)" };
    const m = mapping(cfg);
    try {
      const res = await fetch(url(cfg, m.verify_path ?? "students/verify"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          student_number: input.studentNumber,
          last_name: input.lastName,
          first_name: input.firstName,
          birth_date: input.birthDate,
          academic_year: input.academicYear,
        }),
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404) return notFound();
      if (!res.ok) return { kind: "error", message: `Réponse HTTP ${res.status}` };
      const body = (await res.json()) as Record<string, unknown>;
      const found = pick(body, m.found ?? "found") !== false;
      if (!found) return notFound();
      const enrolled = pick(body, m.enrolled ?? "enrolled") === true;
      // Si l'API renvoie l'identité, on compare nous-mêmes ; sinon on se fie à sa réponse « match »
      const srcLast = str(pick(body, m.last_name ?? "last_name"));
      const srcFirst = str(pick(body, m.first_name ?? "first_name"));
      const srcBirth = str(pick(body, m.birth_date ?? "birth_date"));
      const apiMatch = pick(body, m.identity_match ?? "identity_match");
      const criteria: MatchCriteria = {
        student_number: true,
        last_name: srcLast ? normalizeName(srcLast) === normalizeName(input.lastName) : apiMatch === true,
        first_name: srcFirst ? normalizeName(srcFirst) === normalizeName(input.firstName) : null,
        birth_date: srcBirth && input.birthDate ? srcBirth.slice(0, 10) === input.birthDate : apiMatch === true ? true : null,
      };
      return {
        kind: "answer",
        found: true,
        enrolled,
        criteria,
        reference: str(pick(body, m.reference ?? "reference")) ?? null,
        academic: {
          faculty: str(pick(body, m.faculty ?? "faculty")),
          department: str(pick(body, m.department ?? "department")),
          program: str(pick(body, m.program ?? "program")),
          study_level: str(pick(body, m.study_level ?? "level")),
        },
      };
    } catch (e) {
      return { kind: "error", message: e instanceof Error ? e.message.slice(0, 200) : "Erreur réseau" };
    }

    function notFound(): ConnectorResult {
      return {
        kind: "answer",
        found: false,
        enrolled: false,
        criteria: { student_number: false, last_name: false, first_name: null, birth_date: null },
        reference: null,
        academic: {},
      };
    }
  },

  async test(cfg) {
    const headers = authHeaders(cfg);
    if (!cfg.base_url) return { ok: false, message: "URL de l'API non renseignée." };
    if (!cfg.secret_ref) return { ok: false, message: "Nom de la variable secrète non renseigné." };
    if (!headers) return { ok: false, message: `Variable ${cfg.secret_ref} absente des variables d'environnement du serveur.` };
    try {
      const res = await fetch(url(cfg, mapping(cfg).health_path ?? "health"), {
        headers: { ...headers, Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return res.ok
        ? { ok: true, message: `Connexion réussie (HTTP ${res.status}).` }
        : { ok: false, message: `L'API a répondu HTTP ${res.status}.` };
    } catch (e) {
      return { ok: false, message: `Connexion impossible : ${e instanceof Error ? e.message.slice(0, 200) : "erreur réseau"}` };
    }
  },
};

export const CONNECTORS: Record<IntegrationRow["provider"], UniversityConnector> = {
  rest_json_v1: restJsonV1,
};
