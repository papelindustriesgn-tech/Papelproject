import { PageReferentiel } from "@/components/referentiels/page-referentiel";

export default async function Liste({ params, searchParams }: PageProps<"/rh/listes/[code]">) {
  const { code } = await params;
  return <PageReferentiel espace="rh" code={code} searchParams={await searchParams} />;
}
