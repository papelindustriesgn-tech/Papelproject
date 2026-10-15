import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filters";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EMAIL_PROVIDERS, EMAIL_STATUS, parseEmailSettings, type EmailStatus } from "@/lib/student-email";
import { param, type SearchParams } from "@/lib/url";
import { allocateMissingEmails, applyEmailPolicy, markEmailSynced, setEmailStatus } from "../university-actions";
import { ResultButton } from "../universites/forms";
import { DnsChecker, EmailSettingsForm } from "./forms";

export const metadata = { title: "Emails étudiants" };

const NEXT_ACTIONS: Record<EmailStatus, { to: EmailStatus; label: string }[]> = {
  pending: [
    { to: "active", label: "Boîte créée → activer" },
    { to: "disabled", label: "Annuler" },
  ],
  active: [
    { to: "suspended", label: "Suspendre" },
    { to: "alumni", label: "Alumni" },
    { to: "disabled", label: "Désactiver" },
  ],
  suspended: [
    { to: "active", label: "Réactiver" },
    { to: "alumni", label: "Alumni" },
    { to: "disabled", label: "Désactiver" },
  ],
  alumni: [
    { to: "active", label: "Réactiver" },
    { to: "suspended", label: "Suspendre" },
    { to: "disabled", label: "Désactiver" },
  ],
  disabled: [],
};

export default async function StudentEmailsAdmin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = param(sp, "statut") as EmailStatus | undefined;
  const supabase = await createClient();
  let query = supabase
    .from("student_email_accounts")
    .select(
      "id, address, status, provider, created_at, activated_at, status_changed_at, last_synced_at, user_id, student:profiles!student_email_accounts_user_id_fkey(first_name, last_name, uny_id), university:universities(short_name, name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status in EMAIL_STATUS) query = query.eq("status", status);
  const [{ data: rows }, { data: s }] = await Promise.all([
    query,
    supabase.from("platform_settings").select("value").eq("key", "student_email").single(),
  ]);
  const settings = parseEmailSettings(s?.value);
  const provider = EMAIL_PROVIDERS[settings.provider];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Emails étudiants</h1>
        <p className="text-muted text-sm">
          Une adresse prenom.nom@{settings.domain ?? "domaine-etudiant"} par étudiant vérifié, hébergée chez un fournisseur
          professionnel. Uny réserve l&apos;adresse (homonymes : prenom.nom2…), ne la réattribue jamais et ne stocke aucun mot de
          passe.
        </p>
      </div>

      {!settings.domain && (
        <div className="bg-mango-50 text-mango-700 flex gap-3 rounded-2xl p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <p>
            <strong>Pas encore actif :</strong> achète le domaine Uny, ouvre un compte chez le fournisseur (Google Workspace for
            Education ou Microsoft 365 A1 sont gratuits pour les établissements éligibles), ajoute les enregistrements DNS (MX,
            SPF, DKIM, DMARC), puis renseigne le domaine ci-dessous. Voir docs/EMAILS-ETUDIANTS.md.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Réglages</h2>
          <EmailSettingsForm settings={settings} />
        </section>
        <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Sécurité du domaine</h2>
          <ul className="text-muted space-y-1 text-sm">
            <li>• SPF, DKIM et DMARC (p=quarantine puis p=reject) sur le domaine étudiant</li>
            <li>• Double authentification (MFA) imposée dans la console du fournisseur</li>
            <li>• Anti-spam et anti-hameçonnage du fournisseur activés</li>
            <li>• Récupération du compte par l&apos;email personnel vérifié de l&apos;étudiant</li>
            <li>• Chaque action est journalisée (Registre d&apos;audit)</li>
          </ul>
          <DnsChecker />
          <p className="text-muted flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-4" aria-hidden /> Fournisseur : {provider.label}
            {provider.console && (
              <>
                {" "}
                ·{" "}
                <a href={provider.console} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold">
                  console
                </a>
              </>
            )}
            {!provider.connected && " · création automatique non connectée (création manuelle)"}
          </p>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <ResultButton action={allocateMissingEmails} label="Réserver les adresses des étudiants vérifiés" variant="primary" />
        <ResultButton action={applyEmailPolicy} label="Appliquer la politique de fin de statut" />
      </section>

      <FilterChips
        pathname="/admin/emails"
        searchParams={sp}
        name="statut"
        allLabel="Toutes"
        options={Object.entries(EMAIL_STATUS).map(([value, st]) => ({ value, label: st.label }))}
      />

      {!rows?.length ? (
        <EmptyState emoji="✉️" title="Aucune adresse" text="Les adresses réservées apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-muted border-line border-b text-xs uppercase">
              <tr>
                <th className="p-3">Adresse</th>
                <th className="p-3">Étudiant</th>
                <th className="p-3">Université</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Créée</th>
                <th className="p-3">Dernière synchro</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((r) => {
                const st = EMAIL_STATUS[r.status];
                const outOfSync = !r.last_synced_at || r.last_synced_at < r.status_changed_at;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="p-3 font-mono text-xs font-semibold break-all">{r.address}</td>
                    <td className="p-3">
                      {r.student ? (
                        <Link href={`/admin/utilisateurs/${r.user_id}`} className="hover:underline">
                          {r.student.first_name} {r.student.last_name}
                        </Link>
                      ) : (
                        <span className="text-muted">Compte supprimé</span>
                      )}
                    </td>
                    <td className="p-3">{r.university?.short_name ?? r.university?.name ?? "—"}</td>
                    <td className="p-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="text-muted p-3 whitespace-nowrap">{formatDate(r.created_at, { month: "short" })}</td>
                    <td className="p-3 whitespace-nowrap">
                      {r.last_synced_at ? formatDate(r.last_synced_at, { month: "short" }) : "—"}
                      {outOfSync && r.status !== "disabled" && (
                        <form action={markEmailSynced.bind(null, r.id)}>
                          <button
                            className="text-mango-700 text-xs font-semibold underline"
                            title="Changement à répercuter chez le fournisseur"
                          >
                            À répercuter · marquer synchronisé
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {NEXT_ACTIONS[r.status].map((a) => (
                          <form key={a.to} action={setEmailStatus.bind(null, r.id, a.to, undefined)}>
                            <button className="ring-line hover:ring-brand-300 rounded-lg px-2 py-1 text-xs font-semibold ring-1">
                              {a.label}
                            </button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
