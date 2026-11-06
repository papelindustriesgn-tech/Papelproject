"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionState } from "@/lib/admin";

/**
 * Soumet un formulaire à une Server Action SANS la réinitialisation automatique de React :
 * en cas d'erreur, les saisies sont conservées ; en cas de succès, le message reste affiché.
 */
export function useFormAction(action: (state: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}
