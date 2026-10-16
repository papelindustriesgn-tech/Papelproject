import { exigerEspace } from "@/lib/auth/session";

/** Espace Administration : réservé aux administrateurs et à la Direction. */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigerEspace("admin");
  return children;
}
