import { exigerEspace } from "@/lib/auth/session";

/** Espace Production. Revérifie les droits en base à chaque requête. */
export default async function LayoutProduction({ children }: { children: React.ReactNode }) {
  await exigerEspace("production");
  return children;
}
