"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Option } from "@/lib/survey";

const chip = (on: boolean) =>
  cn(
    "cursor-pointer rounded-2xl px-3.5 py-2.5 text-sm font-semibold ring-1 transition select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500",
    on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink ring-line hover:ring-brand-300",
  );

export function Question({
  n,
  title,
  hint,
  error,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <legend className="sr-only">{title}</legend>
      <p className="font-bold" aria-hidden>
        <span className="text-brand-600">{n}.</span> {title}
      </p>
      {hint && <p className="text-muted mt-0.5 text-sm">{hint}</p>}
      <div className="mt-3">{children}</div>
      {error && <p className="text-coral-600 mt-2 text-sm font-medium">{error}</p>}
    </fieldset>
  );
}

/** Choix unique sous forme de pastilles. */
export function SingleChoice({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className={chip(value === o.value)}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Choix multiples sous forme de pastilles. */
export function MultiChoice({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <label key={o.value} className={chip(on)}>
            <input
              type="checkbox"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

/** Écran de remerciement après envoi. */
export function ThankYou({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
      <p className="text-5xl" aria-hidden>
        💜
      </p>
      <h2 className="mt-3 text-xl font-extrabold">Merci pour ton avis !</h2>
      <p className="text-muted mt-1">{text}</p>
      <a href={href} className="bg-brand-600 mt-5 inline-flex h-12 items-center rounded-2xl px-6 font-semibold text-white">
        {cta}
      </a>
    </div>
  );
}
