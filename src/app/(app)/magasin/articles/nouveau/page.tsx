import Link from "next/link";
import { Carte, TitrePage } from "@/components/ui";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulaireNouvelArticle } from "../formulaires";

export default async function NouvelArticle() {
  const supabase = await clientServeur();
  const { data: categories } = await supabase.from("categories_articles").select("id, libelle, famille").eq("actif", true).order("libelle");
  return (
    <>
      <Link href="/magasin/articles" className="text-papel-700 underline">
        ← Articles
      </Link>
      <TitrePage titre="Nouvel article" />
      <Carte>
        <FormulaireNouvelArticle categories={categories ?? []} />
      </Carte>
    </>
  );
}
