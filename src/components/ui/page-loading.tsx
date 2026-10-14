import { Skeleton } from "@/components/ui/skeleton";

/** Écran de chargement générique : l'application réagit dès le clic, même sur un réseau lent. */
export function PageLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Chargement">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
