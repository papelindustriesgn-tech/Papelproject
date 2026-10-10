import { PERIODES, type Periode } from "@/lib/formulaires/periode";

/** Sélecteur de période (formulaire GET, fonctionne sans JavaScript). */
export function SelecteurPeriode({ periode }: { periode: Periode }) {
  return (
    <form className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-white p-3">
      <label className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-gray-700">Période</span>
        <select name="periode" defaultValue={periode.code} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9">
          {PERIODES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.libelle}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Du (personnalisée)</span>
        <input type="date" name="du" defaultValue={periode.du} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9" />
      </label>
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Au</span>
        <input type="date" name="au" defaultValue={periode.au} className="min-h-11 rounded border border-gray-300 bg-white px-3 md:min-h-9" />
      </label>
      <button className="min-h-11 rounded bg-papel-700 px-4 font-medium text-white hover:bg-papel-800 md:min-h-9">Afficher</button>
    </form>
  );
}
