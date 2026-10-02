import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/commercial/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="commercial" code={code} searchParams={await searchParams} />;
}
