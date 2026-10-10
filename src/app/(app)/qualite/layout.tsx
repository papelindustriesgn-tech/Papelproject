import { exigerEspace } from "@/lib/auth/session";

/** Espace Qualité (QHSE). Revérifie les droits en base à chaque requête. */
export default async function LayoutQualite({ children }: { children: React.ReactNode }) {
  await exigerEspace("qualite");
  return children;
}
