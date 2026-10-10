import { exigerEspace } from "@/lib/auth/session";

/** Espace Magasin (stocks). Revérifie les droits en base à chaque requête. */
export default async function LayoutMagasin({ children }: { children: React.ReactNode }) {
  await exigerEspace("magasin");
  return children;
}
