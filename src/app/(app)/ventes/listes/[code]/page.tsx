import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/ventes/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="ventes" code={code} searchParams={await searchParams} />;
}
