import { cn } from "@/lib/cn";

/** Logo Uny : pastille « u » + wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <rect width="48" height="48" rx="14" fill="#5733f0" />
      <path d="M14 14v11a10 10 0 0 0 20 0V14" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="36.5" cy="36.5" r="4.5" fill="#ffb23f" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-2xl font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>
        uny<span className="text-mango-400">.</span>
      </span>
    </span>
  );
}
