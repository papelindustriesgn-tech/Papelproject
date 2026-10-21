"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { UNIVERSITY_ROLES } from "@/lib/university-roles";
import { addMember, changeMemberRole, removeMember } from "./actions";

export function AddMemberForm() {
  const [state, action] = useActionState(addMember, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage type={state.ok ? "success" : "error"}>{state.message ?? state.error}</FormMessage>
      <Field label="Email professionnel" htmlFor="member-email">
        <Input id="member-email" name="email" type="email" required defaultValue={state.values?.email} autoComplete="off" />
      </Field>
      <Field label="Rôle" htmlFor="member-role">
        <Select id="member-role" name="role" defaultValue="viewer">
          {Object.entries(UNIVERSITY_ROLES).map(([v, r]) => (
            <option key={v} value={v}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton>Ajouter</SubmitButton>
    </form>
  );
}

export function MemberRow({
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
    <li className="flex flex-wrap items-center gap-3 py-3" data-testid="member">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {name} {self && <span className="text-muted text-xs">(vous)</span>}
        </p>
        <p className="text-muted truncate text-xs">{email}</p>
        {error && <p className="text-coral-600 text-xs">{error}</p>}
      </div>
      <Select
        aria-label={`Rôle de ${name}`}
        defaultValue={role}
        disabled={pending}
        className="w-auto"
        onChange={(e) => start(async () => setError((await changeMemberRole(userId, e.target.value)).error))}
      >
        {Object.entries(UNIVERSITY_ROLES).map(([v, r]) => (
          <option key={v} value={v}>
            {r.label}
          </option>
        ))}
      </Select>
      {!self && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(async () => setError((await removeMember(userId)).error))}
        >
          Retirer
        </Button>
      )}
    </li>
  );
}
