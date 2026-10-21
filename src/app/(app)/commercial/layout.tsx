import { exigerEspace } from "@/lib/auth/session";

/** Espace du responsable commercial. */
export default async function LayoutCommercial({ children }: { children: React.ReactNode }) {
  await exigerEspace("commercial");
  return children;
}
