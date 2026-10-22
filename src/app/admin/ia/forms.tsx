"use client";

import { useActionState, useState } from "react";
import { FormMessage, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { answerConversation, configureAi, decideApproval, requestReport, retrySupportNotification } from "./actions";

export function ConfigForm({
  agent,
  enabled,
  budget,
  maxDay,
  maxUserDay,
}: {
  agent: string;
  enabled: boolean;
  budget: number;
  maxDay?: number;
  maxUserDay?: number;
}) {
  const [state, action] = useActionState(configureAi.bind(null, agent), {});
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3 text-sm" data-testid={`config-${agent}`}>
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
        {agent === "*" ? "IA activée" : "Agent actif"}
      </label>
      <label className="space-y-1">
        <span className="text-muted block text-xs">Plafond mensuel (USD)</span>
        <Input name="budget" type="number" min={0} step="0.01" defaultValue={budget} className="h-9 w-28" />
      </label>
      {agent !== "*" && (
        <>
          <label className="space-y-1">
            <span className="text-muted block text-xs">Appels / jour</span>
            <Input name="max_day" type="number" min={0} defaultValue={maxDay} className="h-9 w-24" />
          </label>
          <label className="space-y-1">
            <span className="text-muted block text-xs">Par personne / jour</span>
            <Input name="max_user_day" type="number" min={0} defaultValue={maxUserDay} className="h-9 w-24" />
          </label>
        </>
      )}
      <SubmitButton size="sm" variant="outline">
        Enregistrer
      </SubmitButton>
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
    </form>
  );
}

export function ReportForm({ disabledReason }: { disabledReason: string | null }) {
  const [state, action] = useActionState(requestReport, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <Select name="days" defaultValue="7" aria-label="Période" className="h-9 w-32">
        <option value="7">7 jours</option>
        <option value="30">30 jours</option>
      </Select>
      <SubmitButton size="sm" pendingLabel="Génération…">
        Générer un rapport
      </SubmitButton>
      {disabledReason && <span className="text-muted text-xs">Actuellement : {disabledReason}</span>}
      <FormMessage>{state.error}</FormMessage>
    </form>
  );
}

export function ApprovalForm({ id }: { id: string }) {
  const [state, action] = useActionState(decideApproval.bind(null, id), {});
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="flex gap-2">
      <SubmitButton name="decision" value="approve" size="sm" variant="outline">
        Approuver
      </SubmitButton>
      <SubmitButton name="decision" value="reject" size="sm" variant="danger">
        Refuser
      </SubmitButton>
      <FormMessage>{state.error}</FormMessage>
    </form>
  );
}

export function AnswerForm({ id }: { id: string }) {
  const [state, action] = useActionState(answerConversation.bind(null, id), {});
  // Clé stable pour ce formulaire : un double envoi ou une nouvelle tentative ne crée pas de doublon
  const [requestId] = useState(() => crypto.randomUUID());
  if (state.ok) return <FormMessage type="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="request_id" value={requestId} />
      <Textarea name="answer" rows={2} maxLength={2000} placeholder="Réponse de l'équipe" aria-label="Réponse" />
      <SubmitButton size="sm" variant="outline">
        Répondre (notification dans l&apos;app)
      </SubmitButton>
      <FormMessage>{state.error}</FormMessage>
    </form>
  );
}

export function RetryNotificationForm({ id }: { id: string }) {
  const [state, action] = useActionState(retrySupportNotification.bind(null, id), {});
  return (
    <form action={action} className="mt-2 flex items-center gap-2">
      <SubmitButton size="sm" variant="outline">
        Renvoyer la notification
      </SubmitButton>
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
    </form>
  );
}
