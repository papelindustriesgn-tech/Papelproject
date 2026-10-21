"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { addPartnerMember, removePartnerMember } from "./actions";

const ROLES = { manager: "Responsable", cashier: "Caissier" } as const;

export function AddPartnerMemberForm() {
  const [state, action] = useActionState(addPartnerMember, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <Field label="Email du compte Uny" htmlFor="pm-email">
        <Input id="pm-email" name="email" type="email" required defaultValue={state.values?.email} autoComplete="off" />
      </Field>
      <Field label="Rôle" htmlFor="pm-role">
        <Select id="pm-role" name="role" defaultValue="cashier">
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton>Ajouter</SubmitButton>
    </form>
  );
}

export function PartnerMemberRow({
  userId,
  name,
  email,
  role,
  self,
}: {
  userId: string;
  name: string;
  email: string;
  role: string;
  self: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {name} {self && <span className="text-muted text-xs">(toi)</span>}
        </p>
        <p className="text-muted truncate text-xs">
          {email} · {ROLES[role as keyof typeof ROLES] ?? role}
        </p>
        {error && <p className="text-coral-600 text-xs">{error}</p>}
      </div>
      {!self && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => setError((await removePartnerMember(userId)).error))}
        >
          Retirer
        </Button>
      )}
    </li>
  );
}
