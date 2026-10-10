import { exigerEspace } from "@/lib/auth/session";

export default async function LayoutDirection({ children }: { children: React.ReactNode }) {
  await exigerEspace("direction");
  return children;
}
