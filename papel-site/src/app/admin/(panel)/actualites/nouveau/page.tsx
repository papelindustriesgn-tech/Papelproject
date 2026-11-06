import { AdminHeader } from "@/components/admin/shared";
import { NewsForm } from "@/components/admin/news-form";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Nouvel article" };

export default async function NewNews() {
  await requireAdmin();
  return (
    <>
      <AdminHeader title="Nouvel article" />
      <NewsForm />
    </>
  );
}
