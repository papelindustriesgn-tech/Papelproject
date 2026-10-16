import type { Metadata } from "next";
import { ApplicationTerrain } from "@/components/terrain/application";
import { exigerEspace } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Terrain" };

/** Application des commerciaux terrain (installable, hors ligne). */
export default async function PageTerrain() {
  const u = await exigerEspace("terrain");
  return <ApplicationTerrain utilisateurId={u.id} />;
}
