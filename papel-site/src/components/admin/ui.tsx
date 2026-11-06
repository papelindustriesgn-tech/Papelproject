"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin";

export function SubmitButton({
  children,
  variant = "primary",
  pending: forced,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  /** État explicite (soumission via useFormAction) ; sinon déduit du formulaire parent. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = forced ?? status.pending;
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${state.ok ? "bg-papel-50 text-papel-800" : "bg-corail/10 text-corail"}`}
    >
      {state.ok ? <CheckCircle2 className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
      {state.message}
    </p>
  );
}

export function ConfirmButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className ?? "rounded-full px-4 py-2 text-sm font-semibold text-corail hover:bg-corail/10"}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
