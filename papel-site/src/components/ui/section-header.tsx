import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="mb-3 eyebrow">{eyebrow}</p>}
      <Tag className="text-3xl font-bold text-papel-950 sm:text-4xl">{title}</Tag>
      {intro && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p>}
    </div>
  );
}
