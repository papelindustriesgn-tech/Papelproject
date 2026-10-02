import { Carte, TitrePage } from "@/components/ui";
import type { Espace } from "@/lib/auth/espaces";

/** Page provisoire d'un espace livré dans une étape ultérieure. */
export function EnConstruction({ espace }: { espace: Espace }) {
  return (
    <>
      <TitrePage titre={espace.libelle} sousTitre={espace.description} />
      <Carte>
        <p>
          Cet espace sera disponible à l&apos;étape : <strong>{espace.disponibilite}</strong>.
        </p>
      </Carte>
    </>
  );
}
