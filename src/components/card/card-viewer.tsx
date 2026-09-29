"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { UnyCard, type UnyCardData } from "./uny-card";
import { Button } from "@/components/ui/button";

type WakeLock = { release: () => Promise<void> };

/** Carte + mode « présentation » plein écran pour la montrer à un partenaire. */
export function CardViewer({ data, bigQrSvg }: { data: UnyCardData; bigQrSvg: string }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const wakeLock = useRef<WakeLock | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    // Garde l'écran allumé pendant la présentation (si supporté)
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (wakeLock.current = l))
      .catch(() => {});
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [open]);

  const show = () => {
    setNow(new Date());
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="group block w-full max-w-md text-left transition active:scale-[0.99]"
        aria-label="Agrandir ma carte pour la présenter"
      >
        <UnyCard data={data} />
      </button>
      <Button onClick={show} size="lg" className="mt-4 w-full max-w-md">
        <Maximize2 className="size-4" /> Présenter ma carte
      </Button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Présentation de la carte Uny"
            className="bg-brand-950 fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex w-full max-w-md items-center justify-between py-2 text-white">
              <p className="text-sm font-semibold text-white/70">Présente cet écran au partenaire</p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Fermer"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="mt-2 w-full max-w-md">
              <UnyCard data={{ ...data, qrSvg: null }} />
            </div>
            <div className="mt-5 w-full max-w-[260px] rounded-3xl bg-white p-4 shadow-[var(--shadow-float)]">
              <div className="aspect-square [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: bigQrSvg }} />
              <p className="text-muted mt-2 text-center text-xs font-semibold">Scanner pour vérifier l&apos;authenticité</p>
            </div>
            {/* Horloge et bandeau animés : prouvent qu'il ne s'agit pas d'une capture d'écran */}
            <div className="mt-5 w-full max-w-md overflow-hidden rounded-2xl bg-white/10 text-center text-white">
              <div className="h-1 w-full animate-[shimmer_2s_linear_infinite] bg-[linear-gradient(90deg,transparent,#ffb23f,transparent)] bg-[length:50%_100%] bg-no-repeat" />
              <p className="py-3 font-mono text-lg font-bold tabular-nums" aria-live="off">
                {now
                  ? now.toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
