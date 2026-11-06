import { AdminHeader } from "@/components/admin/shared";
import { HomeForm } from "@/components/admin/home-form";
import { requireAdmin } from "@/lib/admin";
import { readSettings } from "@/lib/admin-settings";

export const metadata = { title: "Page d'accueil" };

export default async function HomeSettingsPage() {
  const { supabase } = await requireAdmin();
  const { home } = await readSettings(supabase);
  return (
    <>
      <AdminHeader title="Page d'accueil" intro="Textes et visuels du bandeau principal et des sections éditoriales." />
      <HomeForm home={home} />
    </>
  );
}
