import { LIBELLES_ROLES, ROLES } from "@/lib/auth/espaces";

/** Cases à cocher des rôles (gros éléments tactiles). */
export function CasesRoles({ coches = [], erreur }: { coches?: string[]; erreur?: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 font-medium text-gray-800">
        Rôles <span className="text-red-700">*</span>
      </legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {ROLES.map((r) => (
          <label key={r} className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 hover:bg-papel-50">
            <input type="checkbox" name="roles" value={r} defaultChecked={coches.includes(r)} className="size-5 accent-papel-700" />
            {LIBELLES_ROLES[r]}
          </label>
        ))}
      </div>
      {erreur && <p className="text-sm font-medium text-red-700">{erreur}</p>}
    </fieldset>
  );
}
