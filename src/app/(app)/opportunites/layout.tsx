import { redirect } from "next/navigation";
import { OPPORTUNITIES_ENABLED } from "@/lib/features";

/** Rubrique optionnelle, masquée tant qu'Uny est recentrée sur les offres (voir src/lib/features.ts). */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!OPPORTUNITIES_ENABLED) redirect("/avantages");
  return children;
}
