import { exigerEspace } from "@/lib/auth/session";

export default async function LayoutAchats({ children }: { children: React.ReactNode }) {
  await exigerEspace("achats");
  return children;
}
