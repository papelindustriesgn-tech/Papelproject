import { BackLink } from "@/components/ui/back-link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AskForm, HumanButton } from "./support-forms";

export const metadata = { title: "Aide" };

/** Aide : assistant (documentation validée + statut de la personne connectée) et transfert vers l'équipe. */
export default async function HelpPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  // Lecture sous RLS : seules les conversations de la personne connectée sont visibles
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, status, messages:ai_messages(id, role, content, created_at)")
    .eq("user_id", profile.id)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const messages = [...(conv?.messages ?? [])].sort((a, b) => a.id - b.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <BackLink href="/profil" label="Profil" />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Aide</h1>
        <p className="text-muted text-sm">
          L&apos;assistant répond à partir de l&apos;aide officielle de Uny et de l&apos;état de ton compte. Il ne peut
          effectuer aucune action à ta place. Il peut se tromper : en cas de doute, demande une personne de l&apos;équipe.
        </p>
      </div>
      {messages.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {messages.map((m) => (
            <li
              key={m.id}
              data-testid={`msg-${m.role}`}
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-brand-600 ml-8 text-white" : m.role === "assistant" ? "mr-8 bg-white shadow-[var(--shadow-card)]" : "bg-mango-50 text-mango-700",
              )}
            >
              {m.content}
              <span className={cn("mt-1 block text-[11px]", m.role === "user" ? "text-brand-100" : "text-muted")}>
                {formatDate(m.created_at, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {conv?.status === "handed_off" ? (
        <p className="bg-mango-50 text-mango-700 rounded-2xl p-3 text-sm">
          Ta demande est entre les mains de l&apos;équipe Uny. La réponse apparaîtra ici.
        </p>
      ) : (
        <>
          <AskForm conversationId={conv?.id ?? null} />
          <HumanButton conversationId={conv?.id ?? null} />
        </>
      )}
    </div>
  );
}
