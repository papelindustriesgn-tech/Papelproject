import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/magasin/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="magasin" code={code} searchParams={await searchParams} />;
}
