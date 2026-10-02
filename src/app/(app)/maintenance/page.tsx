import { EnConstruction } from "@/components/coque/en-construction";
import { ESPACES } from "@/lib/auth/espaces";

export default function Page() {
  return <EnConstruction espace={ESPACES.find((e) => e.code === "maintenance")!} />;
}
