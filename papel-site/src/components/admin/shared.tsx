import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminHeader({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold text-papel-950 sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6", className)}>{children}</div>;
}

const TONES: Record<string, string> = {
  published: "bg-papel-50 text-papel-700",
  draft: "bg-soleil/15 text-[#8a5a00]",
  archived: "bg-sable text-muted",
  nouveau: "bg-corail/10 text-corail",
  a_contacter: "bg-soleil/15 text-[#8a5a00]",
  en_discussion: "bg-sky-50 text-sky-700",
  converti: "bg-papel-50 text-papel-700",
  cloture: "bg-sable text-muted",
  traite: "bg-papel-50 text-papel-700",
  archive: "bg-sable text-muted",
};

export function StatusPill({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", TONES[value] ?? "bg-sable")}
    >
      {label}
    </span>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

export function NewButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-full bg-papel-700 px-4 text-sm font-semibold text-white hover:bg-papel-800"
    >
      {children}
    </Link>
  );
}

export const th = "px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase";
export const td = "px-4 py-3 align-top";
