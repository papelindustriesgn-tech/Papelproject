import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block w-full h-12 rounded-2xl border border-line bg-white px-4 text-[16px] text-ink placeholder:text-muted/70 transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-coral-500";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-muted">facultatif</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-coral-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        inputClass,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b6889%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function FormMessage({ type = "error", children }: { type?: "error" | "success" | "info"; children: ReactNode }) {
  if (!children) return null;
  const styles = {
    error: "bg-coral-50 text-coral-600",
    success: "bg-mint-50 text-mint-700",
    info: "bg-brand-50 text-brand-800",
  };
  return (
    <div role={type === "error" ? "alert" : "status"} className={cn("rounded-2xl px-4 py-3 text-sm font-medium", styles[type])}>
      {children}
    </div>
  );
}
