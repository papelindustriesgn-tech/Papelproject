import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, CreditCard, Heart, LogOut, Pencil, Settings, ShieldCheck, ShieldHalf, ShoppingBag, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { VerificationBadge } from "@/components/ui/badge";
import { requireProfile, universityLabel } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { AvatarUpload } from "./avatar-upload";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const p = await requireProfile();
  const rows = [
    { label: "Établissement", value: universityLabel(p) },
    { label: "Filière", value: p.field_of_study ?? "—" },
    { label: "Niveau", value: p.study_level ?? "—" },
    { label: "Ville", value: p.city?.name ?? "—" },
    { label: "Numéro Uny", value: p.uny_id, mono: true },
    { label: "Membre depuis", value: formatDate(p.created_at, { day: undefined }) },
  ];
  const menu = [
    { href: "/profil/modifier", label: "Modifier mes informations", icon: Pencil },
    { href: "/profil/verification", label: "Vérification étudiante", icon: UserCheck },
    { href: "/carte", label: "Ma carte Uny", icon: CreditCard },
    { href: "/marketplace/mes-annonces", label: "Mes annonces", icon: ShoppingBag },
    { href: "/favoris", label: "Mes favoris", icon: Heart },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profil/parametres", label: "Paramètres", icon: Settings },
    { href: "/profil/securite", label: "Sécurité", icon: ShieldHalf },
    ...(p.role === "admin" ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-5">
      <section className="flex flex-col items-center rounded-[var(--radius-card)] bg-white px-5 pt-6 pb-5 text-center shadow-[var(--shadow-card)]">
        <AvatarUpload userId={p.id} current={p.avatar_url}>
          <Avatar src={p.avatar_url} first={p.first_name} last={p.last_name} size={96} />
        </AvatarUpload>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          {p.first_name} {p.last_name}
        </h1>
        <p className="text-sm text-muted">{p.email}</p>
        <VerificationBadge status={p.verification_status} className="mt-3" />
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="text-muted">{r.label}</dt>
              <dd className={`truncate font-semibold ${r.mono ? "font-mono" : ""}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="Menu du profil" className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
        <ul className="divide-y divide-line">
          {menu.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 px-5 py-4 font-semibold hover:bg-canvas">
                <Icon className="size-5 text-brand-600" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <form action="/auth/deconnexion" method="post">
              <button className="flex w-full items-center gap-3 px-5 py-4 text-left font-semibold text-coral-600 hover:bg-coral-50">
                <LogOut className="size-5" aria-hidden />
                Déconnexion
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </div>
  );
}
