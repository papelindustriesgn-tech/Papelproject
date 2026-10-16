/** Affiché instantanément pendant le chargement d'une page : l'utilisateur voit que l'action a été prise en compte. */
export default function Chargement() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-busy="true" aria-label="Chargement">
      <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-gray-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-md bg-gray-200" />
    </div>
  );
}
