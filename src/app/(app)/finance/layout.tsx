import { exigerEspace } from "@/lib/auth/session";

/** Espace Finance (comptabilité). Revérifie les droits en base à chaque requête. */
export default async function LayoutFinance({ children }: { children: React.ReactNode }) {
  await exigerEspace("finance");
  return children;
}
