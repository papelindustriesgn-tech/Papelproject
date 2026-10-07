"use client";

import { ActionForm } from "@/components/ui/action-form";
import { updateNotificationPrefs } from "../actions";

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-muted block text-sm">{hint}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        className="bg-line peer-checked:bg-brand-600 peer-focus-visible:ring-brand-100 relative h-7 w-12 shrink-0 rounded-full transition peer-focus-visible:ring-4 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
        aria-hidden
      />
    </label>
  );
}

export function NotificationPrefsForm({ email, deals }: { email: boolean; deals: boolean }) {
  return (
    <ActionForm action={updateNotificationPrefs} submitLabel="Enregistrer">
      <div className="divide-line divide-y">
        <Toggle
          name="notify_email"
          label="Emails importants"
          hint="Vérification de statut, sécurité du compte."
          defaultChecked={email}
        />
        <Toggle
          name="notify_deals"
          label="Nouveaux bons plans"
          hint="Les meilleures réductions près de chez toi."
          defaultChecked={deals}
        />
      </div>
    </ActionForm>
  );
}
