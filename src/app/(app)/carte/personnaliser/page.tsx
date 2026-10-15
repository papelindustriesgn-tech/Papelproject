import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile, universityLabel } from "@/lib/auth";
import { getCardData } from "@/lib/card";
import { isCardTheme, isStudentCardLayout } from "@/lib/card-template";
import { CardStyleEditor } from "./style-editor";

export const metadata: Metadata = { title: "Personnaliser ma carte" };

export default async function PersonalizeCardPage() {
  const profile = await requireProfile();
  const { data, university } = await getCardData(profile);
  const initialLayout = isStudentCardLayout(profile.card_layout)
    ? profile.card_layout
    : university
      ? university.template.layout
      : "uny";
  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <BackLink href="/carte" label="Ma carte" />
        <PageTitle title="Personnaliser ma carte" subtitle="Choisis le modèle et les couleurs de ta carte Uny." />
      </div>
      <CardStyleEditor
        base={{ ...data, branding: null, template: null }}
        university={university}
        universityName={universityLabel(profile)}
        initialLayout={university && initialLayout === "uny" ? university.template.layout : initialLayout}
        initialTheme={isCardTheme(profile.card_theme) ? profile.card_theme : "uny"}
      />
    </div>
  );
}
