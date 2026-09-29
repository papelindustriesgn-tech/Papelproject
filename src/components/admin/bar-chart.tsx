/** Histogramme léger en CSS (pas de librairie : rapide sur mobile). */
export function BarChart({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="flex h-40 items-end gap-1 sm:gap-1.5">
        {data.map((d) => (
          <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-bold text-ink tabular-nums opacity-0 transition group-hover:opacity-100">{d.count}</span>
            <div
              className="w-full rounded-t-md bg-brand-500 transition group-hover:bg-brand-700"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
              title={`${new Date(d.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{new Date(data[0].day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        <span>Aujourd&apos;hui</span>
      </div>
    </figure>
  );
}
