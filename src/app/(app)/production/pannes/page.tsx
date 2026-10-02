import type { Metadata } from "next";
import { SignalerPanne } from "@/components/maintenance/signaler-panne";

export const metadata: Metadata = { title: "Pannes" };

export default function PagePannes() {
  return <SignalerPanne espace="production" />;
}
