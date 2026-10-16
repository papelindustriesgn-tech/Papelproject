import { exigerEspace } from "@/lib/auth/session";

/** Espace Ventes (comptabilité et responsable commercial). */
export default async function LayoutVentes({ children }: { children: React.ReactNode }) {
  await exigerEspace("ventes");
  return children;
}
