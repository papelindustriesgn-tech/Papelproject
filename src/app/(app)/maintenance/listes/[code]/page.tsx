import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/maintenance/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="maintenance" code={code} searchParams={await searchParams} />;
}
