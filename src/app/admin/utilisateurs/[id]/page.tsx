import { notFound } from "next/navigation";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Badge, VerificationBadge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { setUserRole, setUserVerification } from "../../actions";

export const metadata = { title: "Utilisateur" };

export default async function UserAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const me = await requireAdmin();
  const supabase = await createClient();
  const [{ data: u }, { data: card }, { data: verifs }, { count: items }, { count: apps }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, university:universities!profiles_university_id_fkey(name), city:cities(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("student_cards").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("student_verifications").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("marketplace_items").select("id", { count: "exact", head: true }).eq("seller_id", id),
    supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", id),
  ]);
  if (!u) notFound();
  const btn = "h-10 rounded-xl px-3 text-sm font-semibold ring-1 ring-line bg-white hover:ring-brand-300";
  const rows: [string, string | null | undefined][] = [
    ["Email", u.email],
    ["Téléphone", u.phone],
    ["Date de naissance", formatDate(u.birth_date)],
    ["Établissement", u.university?.name ?? u.university_other],
    ["Filière", u.field_of_study],
    ["Niveau", u.study_level],
    ["Ville", u.city?.name],
    ["Inscrit", formatDate(u.created_at)],
    ["Dernière activité", u.last_seen_at ? timeAgo(u.last_seen_at) : "—"],
    [
      "Carte",
      card
        ? `${card.academic_year} · expire le ${formatDate(card.expires_at)} · ${card.status === "active" ? "active" : "révoquée"}`
        : "—",
    ],
    ["Annonces / candidatures", `${items ?? 0} / ${apps ?? 0}`],
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink href="/admin/utilisateurs" label="Utilisateurs" />
      <section className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <Avatar src={u.avatar_url} first={u.first_name} last={u.last_name} size={64} />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">
            {u.first_name} {u.last_name}
          </h1>
          <p className="font-mono text-sm">{u.uny_id}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <VerificationBadge status={u.verification_status} />
            {u.role === "admin" && <Badge tone="dark">Admin</Badge>}
            {u.is_test_account && <Badge tone="neutral">Compte de test</Badge>}
          </div>
        </div>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="space-y-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {u.verification_status !== "verified" && (
            <form action={setUserVerification.bind(null, u.id, "verified")}>
              <button className={`${btn} text-mint-700`}>Valider manuellement le statut</button>
            </form>
          )}
          {u.verification_status === "verified" && (
            <form action={setUserVerification.bind(null, u.id, "unverified")}>
              <button className={`${btn} text-coral-600`}>Retirer le statut vérifié</button>
            </form>
          )}
          {u.id !== me.id &&
            (u.role === "admin" ? (
              <form action={setUserRole.bind(null, u.id, "student")}>
                <button className={btn}>Retirer l&apos;accès admin</button>
              </form>
            ) : (
              <form action={setUserRole.bind(null, u.id, "admin")}>
                <button className={btn}>Nommer administrateur</button>
              </form>
            ))}
        </div>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Justificatifs</h2>
        {!verifs?.length ? (
          <p className="text-muted text-sm">Aucun justificatif envoyé.</p>
        ) : (
          <ul className="divide-line divide-y text-sm">
            {verifs.map((v) => (
              <li key={v.id} className="flex justify-between gap-3 py-2">
                <span>
                  {DOCUMENT_TYPES[v.document_type]} · {formatDate(v.created_at)}
                  {v.rejection_reason && <span className="text-coral-600 block">{v.rejection_reason}</span>}
                </span>
                <Badge tone={v.status === "approved" ? "mint" : v.status === "rejected" ? "coral" : "mango"}>
                  {v.status === "approved" ? "Validé" : v.status === "rejected" ? "Refusé" : "En attente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
