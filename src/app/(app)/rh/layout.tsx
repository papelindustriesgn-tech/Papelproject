import { exigerEspace } from "@/lib/auth/session";

/** Espace Ressources humaines. Revérifie les droits en base à chaque requête (salaires confidentiels). */
export default async function LayoutRh({ children }: { children: React.ReactNode }) {
  await exigerEspace("rh");
  return children;
}
