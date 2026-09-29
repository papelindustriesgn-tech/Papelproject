import Image from "next/image";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export function Avatar({
  src,
  first,
  last,
  size = 40,
  className,
}: {
  src?: string | null;
  first?: string | null;
  last?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        initials(first, last)
      )}
    </span>
  );
}
