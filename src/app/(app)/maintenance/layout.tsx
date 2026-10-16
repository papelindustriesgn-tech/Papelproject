import { exigerEspace } from "@/lib/auth/session";

/** Espace Maintenance. Revérifie les droits en base à chaque requête. */
export default async function LayoutMaintenance({ children }: { children: React.ReactNode }) {
  await exigerEspace("maintenance");
  return children;
}
