import { GridSkeleton } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full" />
      <GridSkeleton />
    </div>
  );
}
