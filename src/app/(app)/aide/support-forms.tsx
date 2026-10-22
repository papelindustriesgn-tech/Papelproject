"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { askHuman, askSupport, startNewConversation } from "./actions";

export function AskForm({ conversationId, label }: { conversationId: string | null; label?: string }) {
  const [state, action] = useActionState(askSupport, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      {conversationId && <input type="hidden" name="conversation" value={conversationId} />}
      <Textarea name="question" rows={3} maxLength={1000} required placeholder={label ? "Ton message pour l'équipe…" : "Pose ta question sur Uny…"} aria-label={label ?? "Ta question"} />
      <FormMessage>{state.error}</FormMessage>
      <SubmitButton className="w-full" pendingLabel="Réponse en cours…">
        Envoyer
      </SubmitButton>
    </form>
  );
}

export function HumanButton({ conversationId }: { conversationId: string | null }) {
  const [state, action] = useActionState(askHuman, {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action}>
      {conversationId && <input type="hidden" name="conversation" value={conversationId} />}
      <SubmitButton variant="outline" className="w-full">
        Parler à une personne de l&apos;équipe
      </SubmitButton>
      <FormMessage>{state.error}</FormMessage>
    </form>
  );
}

export function NewConversationButton({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(startNewConversation, {});
  return (
    <form action={action}>
      <input type="hidden" name="conversation" value={conversationId} />
      <SubmitButton variant="ghost" className="w-full">
        Nouvelle question à l&apos;assistant
      </SubmitButton>
      <FormMessage>{state.error}</FormMessage>
    </form>
  );
}
