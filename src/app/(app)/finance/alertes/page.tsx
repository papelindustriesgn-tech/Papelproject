import type { Metadata } from "next";
import { PageAlertes } from "@/components/alertes/page-alertes";

export const metadata: Metadata = { title: "Alertes" };

export default function AlertesFinance() {
  return <PageAlertes espace="finance" />;
}
