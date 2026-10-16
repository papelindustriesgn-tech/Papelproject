import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/direction/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="direction" code={code} searchParams={await searchParams} />;
}
