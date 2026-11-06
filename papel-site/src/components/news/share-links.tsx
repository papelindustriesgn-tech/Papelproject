"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { FacebookIcon, WhatsAppIcon } from "@/components/ui/icons";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const cls =
    "inline-flex h-11 items-center gap-2 rounded-full bg-papel-50 px-4 text-sm font-semibold text-papel-800 hover:bg-papel-100";
  return (
    <div className="mt-12 border-t border-line pt-8">
      <p className="text-sm font-semibold text-papel-950">Partager cette actualité</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className={cls} href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="size-4" /> WhatsApp
        </a>
        <a
          className={cls}
          href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FacebookIcon className="size-4" /> Facebook
        </a>
        <button
          type="button"
          className={cls}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* presse-papiers indisponible */
            }
          }}
        >
          <Link2 className="size-4" aria-hidden /> {copied ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
