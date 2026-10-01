"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, MessageCircle, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/format";

export type Contact = {
  id: string;
  first: string;
  last: string;
  phone: string;
  verified: boolean;
  answered: boolean;
  createdAt: string;
};

type Filter = "all" | "not_answered" | "verified";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "not_answered", label: "N'ont pas répondu à l'enquête" },
  { value: "all", label: "Tous les inscrits" },
  { value: "verified", label: "Étudiants vérifiés" },
];

// Aide-mémoire « déjà contacté », propre à cet appareil (localStorage).
const STORAGE_KEY = "uny-admin-contacted";
const listeners = new Set<() => void>();
const sentStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "[]";
    } catch {
      return "[]";
    }
  },
  set(ids: string[]) {
    try {
      if (ids.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    listeners.forEach((l) => l());
  },
};

const defaultMessage = (url: string) =>
  `Bonjour {prenom} 👋\n\nMerci de t'être inscrit(e) sur Uny ! Aide-nous à construire l'app dont tu as besoin : réponds à notre questionnaire, ça prend 2 minutes 🙏\n\n👉 ${url}\n\nMerci ! L'équipe Uny`;

export function ContactList({ contacts, surveyUrl }: { contacts: Contact[]; surveyUrl: string }) {
  const [message, setMessage] = useState(() => defaultMessage(surveyUrl));
  const [filter, setFilter] = useState<Filter>("not_answered");
  const [copied, setCopied] = useState(false);
  const raw = useSyncExternalStore(sentStore.subscribe, sentStore.get, () => "[]");
  const sent = useMemo(() => new Set<string>(JSON.parse(raw) as string[]), [raw]);
  const markSent = (id: string) => sentStore.set([...new Set([...sent, id])]);
  const resetSent = () => sentStore.set([]);

  const list = useMemo(
    () => contacts.filter((c) => (filter === "not_answered" ? !c.answered : filter === "verified" ? c.verified : true)),
    [contacts, filter],
  );
  const personalize = (c: Contact) => message.replaceAll("{prenom}", c.first);
  const remaining = list.filter((c) => !sent.has(c.id)).length;

  async function copyNumbers() {
    await navigator.clipboard.writeText(list.map((c) => c.phone).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <label htmlFor="message" className="font-bold">
          Ton message
        </label>
        <p className="text-muted mt-0.5 text-sm">
          <code className="bg-canvas rounded px-1">{"{prenom}"}</code> est remplacé par le prénom de chaque étudiant.
        </p>
        <Textarea id="message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-3" />
        <button
          type="button"
          onClick={() => setMessage(defaultMessage(surveyUrl))}
          className="text-brand-600 mt-2 text-sm font-semibold"
        >
          Revenir au message d&apos;invitation à l&apos;enquête
        </button>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm font-semibold ring-1 transition",
              filter === f.value ? "bg-brand-600 ring-brand-600 text-white" : "ring-line bg-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <p className="text-sm">
            <strong>{list.length}</strong> étudiant{list.length > 1 ? "s" : ""} ·{" "}
            <span className="text-muted">{remaining} à contacter</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyNumbers}
              disabled={!list.length}
              className="bg-canvas hover:bg-line inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold disabled:opacity-50"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Numéros copiés" : "Copier les numéros"}
            </button>
            {sent.size > 0 && (
              <button type="button" onClick={resetSent} className="text-muted h-9 px-2 text-sm font-semibold">
                Tout remettre à « à contacter »
              </button>
            )}
          </div>
        </div>
        {list.length === 0 ? (
          <p className="text-muted p-8 text-center text-sm">Personne dans cette liste 🎉</p>
        ) : (
          <ul className="divide-line divide-y">
            {list.map((c) => {
              const done = sent.has(c.id);
              const text = personalize(c);
              return (
                <li key={c.id} className={cn("flex flex-wrap items-center gap-3 p-4", done && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {c.first} {c.last}
                      {done && <span className="text-mint-700 ml-2 text-xs font-bold">✓ contacté</span>}
                    </p>
                    <p className="text-muted text-sm">
                      {c.phone}
                      {c.answered && <span className="text-mint-700"> · a répondu à l&apos;enquête</span>}
                    </p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <a
                      href={whatsappLink(c.phone, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markSent(c.id)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-3 text-sm font-semibold text-white sm:flex-none"
                    >
                      <MessageCircle className="size-4" aria-hidden /> WhatsApp
                    </a>
                    <a
                      href={`sms:${c.phone}?body=${encodeURIComponent(text)}`}
                      onClick={() => markSent(c.id)}
                      className="bg-canvas hover:bg-line inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold sm:flex-none"
                    >
                      <MessageSquareText className="size-4" aria-hidden /> SMS
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
