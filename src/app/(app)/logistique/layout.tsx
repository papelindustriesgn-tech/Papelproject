import { exigerEspace } from "@/lib/auth/session";

/** Espace Logistique. Revérifie les droits en base à chaque requête. */
export default async function LayoutLogistique({ children }: { children: React.ReactNode }) {
  await exigerEspace("logistique");
  return children;
}
