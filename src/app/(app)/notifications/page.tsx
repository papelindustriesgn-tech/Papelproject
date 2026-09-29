import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageTitle } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notifications" };

async function markAllRead() {
  "use server";
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", data.user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

const ICONS: Record<string, string> = {
  welcome: "👋",
  verification_approved: "✅",
  verification_rejected: "⚠️",
  marketplace_removed: "🛑",
};

export default async function NotificationsPage() {
  const p = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", p.id).order("created_at", { ascending: false }).limit(50);
  const items = data ?? [];
  const unread = items.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <PageTitle
        title="Notifications"
        action={
          unread ? (
            <form action={markAllRead}>
              <button className="text-sm font-semibold text-brand-600 hover:underline">Tout marquer comme lu</button>
            </form>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState emoji="🔔" title="Aucune notification" text="Tu seras prévenu ici des nouveautés importantes." />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          {items.map((n) => {
            const inner = (
              <div className={cn("flex gap-3 px-4 py-4", !n.read_at && "bg-brand-50/60")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg ring-1 ring-line" aria-hidden>
                  {ICONS[n.type] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{n.title}</p>
                  {n.body && <p className="text-sm text-ink/75">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-coral-500" aria-label="Non lue" />}
              </div>
            );
            return (
              <li key={n.id} className="border-b border-line last:border-0">
                {n.link ? <Link href={n.link} className="block hover:bg-canvas">{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
