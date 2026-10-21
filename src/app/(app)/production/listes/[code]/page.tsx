import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/production/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="production" code={code} searchParams={await searchParams} />;
}
