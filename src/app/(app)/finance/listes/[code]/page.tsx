import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/finance/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="finance" code={code} searchParams={await searchParams} />;
}
