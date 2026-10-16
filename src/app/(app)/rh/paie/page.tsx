import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Carte, Cellule, Tableau, TitrePage } from "@/components/ui";
import { aujourdhui } from "@/lib/formulaires/dates";
import { libelleMois } from "@/lib/rh/libelles";
import { gnf } from "@/lib/stocks/libelles";
import { clientServeur } from "@/lib/supabase/serveur";
import { FormulairePreparerPaie } from "../formulaires";

export const metadata: Metadata = { title: "Paie" };

export default async function PagePaie() {
  const supabase = await clientServeur();
  const [{ data: periodes }, { data: bulletins }] = await Promise.all([
    supabase.from("periodes_paie").select("*").order("mois", { ascending: false }).limit(36),
    supabase.from("bulletins").select("mois, brut_gnf, net_gnf, cnss_employeur_gnf").limit(20000),
  ]);
  const totaux = new Map<string, { n: number; brut: number; net: number; cout: number }>();
  for (const b of bulletins ?? []) {
    const t = totaux.get(b.mois) ?? { n: 0, brut: 0, net: 0, cout: 0 };
    totaux.set(b.mois, { n: t.n + 1, brut: t.brut + Number(b.brut_gnf), net: t.net + Number(b.net_gnf), cout: t.cout + Number(b.brut_gnf) + Number(b.cnss_employeur_gnf) });
  }
  return (
    <>
      <TitrePage titre="Paie" sousTitre="Une paie par mois : préparer → ajouter primes et avances → valider → payer et imprimer les bulletins." />
      <Carte titre="Préparer une paie" className="mb-4">
        <FormulairePreparerPaie moisDefaut={aujourdhui().slice(0, 7)} />
      </Carte>
      <Carte titre="Paies">
        {periodes?.length ? (
          <Tableau entetes={["Mois", "Bulletins", "Masse salariale brute", "Net à payer", "Coût employeur", "Statut"]}>
            {periodes.map((p) => {
              const t = totaux.get(p.mois) ?? { n: 0, brut: 0, net: 0, cout: 0 };
              return (
                <tr key={p.mois}>
                  <Cellule>
                    <Link href={`/rh/paie/${p.mois.slice(0, 7)}`} className="font-semibold capitalize text-papel-700 hover:underline">
                      {libelleMois(p.mois)}
                    </Link>
                  </Cellule>
                  <Cellule>{t.n}</Cellule>
                  <Cellule>{gnf(t.brut)}</Cellule>
                  <Cellule className="font-semibold">{gnf(t.net)}</Cellule>
                  <Cellule>{gnf(t.cout)}</Cellule>
                  <Cellule>{p.statut === "validee" ? <Badge ton="succes">Validée</Badge> : <Badge ton="alerte">À valider</Badge>}</Cellule>
                </tr>
              );
            })}
          </Tableau>
        ) : (
          <p className="text-gray-700">Aucune paie pour l&apos;instant : choisissez un mois ci-dessus.</p>
        )}
      </Carte>
    </>
  );
}
