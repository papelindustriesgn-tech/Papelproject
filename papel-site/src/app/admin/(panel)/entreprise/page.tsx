import { AdminHeader } from "@/components/admin/shared";
import { CompanyForm } from "@/components/admin/company-form";
import { requireAdmin } from "@/lib/admin";
import { readSettings } from "@/lib/admin-settings";

export const metadata = { title: "Entreprise" };

export default async function CompanySettingsPage() {
  const { supabase } = await requireAdmin();
  const { company } = await readSettings(supabase);
  return (
    <>
      <AdminHeader
        title="Informations de l'entreprise"
        intro="Coordonnées, réseaux sociaux, site industriel et mentions légales."
      />
      <CompanyForm company={company} />
    </>
  );
}
