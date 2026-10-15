import Image from "@/components/ui/safe-image";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { safeImage } from "@/lib/images";

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
        "bg-brand-100 text-brand-700 relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {safeImage(src) ? <Image src={src!} alt="" fill sizes={`${size}px`} className="object-cover" /> : initials(first, last)}
    </span>
  );
}
