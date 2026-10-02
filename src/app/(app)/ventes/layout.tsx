import { exigerEspace } from "@/lib/auth/session";

/** Contrôle d'accès de l'espace (revérifié en base à chaque requête). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigerEspace("ventes");
  return children;
}
