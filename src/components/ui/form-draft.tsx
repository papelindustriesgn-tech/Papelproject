"use client";

import { useEffect, useRef } from "react";

const PREFIX = "uny_draft:";
const SKIP = new Set(["password", "file", "hidden", "submit", "button"]);

/**
 * Brouillon local d'un formulaire : les champs texte sont gardés sur l'appareil pendant la saisie
 * (réseau coupé, application fermée…) et proposés à la réouverture. Jamais les mots de passe ni les fichiers.
 * À placer à l'intérieur du <form>. Le brouillon est effacé à l'envoi.
 */
export function FormDraft({ id }: { id: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const key = PREFIX + id;

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const fields = () =>
      Array.from(form.elements).filter(
        (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
          "name" in el && !!(el as HTMLInputElement).name && !SKIP.has((el as HTMLInputElement).type),
      );
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Record<string, string> | null;
      if (saved) {
        let used = false;
        for (const el of fields()) {
          if (saved[el.name] == null || el.value) continue;
          if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = saved[el.name] === "1";
          else el.value = saved[el.name];
          used = true;
        }
        if (used && anchor.current) anchor.current.textContent = "Brouillon restauré depuis ton téléphone.";
      }
    } catch {}
    const save = () => {
      try {
        const data: Record<string, string> = {};
        for (const el of fields())
          data[el.name] = el instanceof HTMLInputElement && el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value;
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    };
    const clear = () => {
      try {
        localStorage.removeItem(key);
      } catch {}
    };
    form.addEventListener("input", save);
    form.addEventListener("submit", clear);
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("submit", clear);
    };
  }, [key]);

  return (
    <span ref={anchor} role="status" className="text-muted block text-xs empty:hidden" />
  );
}
