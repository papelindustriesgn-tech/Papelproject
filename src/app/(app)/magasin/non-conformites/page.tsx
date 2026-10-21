import type { Metadata } from "next";
import { SignalerNc } from "@/components/qualite/signaler-nc";

export const metadata: Metadata = { title: "Non-conformités" };

export default function PageNonConformites() {
  return <SignalerNc espace="magasin" origine="reception" />;
}
