import { AdminHeader } from "@/components/admin/shared";
import { RangeForm } from "@/components/admin/range-form";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Nouvelle gamme" };

export default async function NewRange() {
  await requireAdmin();
  return (
    <>
      <AdminHeader title="Nouvelle gamme" />
      <RangeForm />
    </>
  );
}
