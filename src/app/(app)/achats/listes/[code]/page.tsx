import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/achats/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="achats" code={code} searchParams={await searchParams} />;
}
