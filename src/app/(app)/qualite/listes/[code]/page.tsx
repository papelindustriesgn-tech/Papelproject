import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/qualite/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="qualite" code={code} searchParams={await searchParams} />;
}
