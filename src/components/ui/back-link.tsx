import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-muted hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm font-semibold">
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Link>
  );
}
