"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/** Bouton submit qui demande confirmation avant une action destructive. */
export function ConfirmButton({ message, children, ...props }: ComponentProps<"button"> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </button>
  );
}
