import { after } from "next/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // Les comptes « partenaire » (commerçants, bailleurs, recruteurs) ont leur propre espace.
  if (profile.role === "partner") redirect("/partenaire");
  // Les comptes « université » ont leur portail.
  if (profile.role === "university") redirect("/universite");
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  after(async () => {
    await supabase.rpc("touch_last_seen");
  });

  const unread = count ?? 0;
  return (
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={profile.role === "admin"} unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader unread={unread} first={profile.first_name} last={profile.last_name} avatar={profile.avatar_url} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
