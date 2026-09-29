import { cn } from "@/lib/cn";

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: number | string; hint?: string; tone?: "default" | "brand" | "mango" | "mint" }) {
  const tones = { default: "bg-white", brand: "bg-brand-600 text-white", mango: "bg-mango-50", mint: "bg-mint-50" };
  return (
    <div className={cn("rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)]", tones[tone])}>
      <p className={cn("text-xs font-semibold", tone === "brand" ? "text-brand-100" : "text-muted")}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
      {hint && <p className={cn("mt-0.5 text-xs", tone === "brand" ? "text-brand-100" : "text-muted")}>{hint}</p>}
    </div>
  );
}
