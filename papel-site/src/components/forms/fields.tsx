import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-ink ring-1 ring-line ring-inset placeholder:text-muted/70 transition focus:ring-2 focus:ring-papel-600 focus:outline-none aria-[invalid=true]:ring-corail";

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-papel-950">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(facultatif)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-corail">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} rows={5} className={cn(inputClass, "resize-y", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputClass,
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2355645f'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z'/%3E%3C/svg%3E\")] appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
});
