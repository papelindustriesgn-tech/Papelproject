"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, CameraOff, Keyboard, Loader2, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import type QrScannerType from "qr-scanner";
import Image from "@/components/ui/safe-image";
import { Input, Select } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { validateCard, type ValidateState, type ValidationResult } from "../actions";

type Deal = { id: string; title: string; discount_label: string };

function Verdict({ r }: { r: ValidationResult }) {
  if (!r.found)
    return (
      <div className="bg-coral-50 text-coral-600 rounded-[var(--radius-card)] p-6 text-center">
        <XCircle className="mx-auto size-14" aria-hidden />
        <p className="mt-2 text-xl font-extrabold">Carte introuvable</p>
        <p className="text-sm">Ce QR code ou ce numéro ne correspond à aucune carte Uny.</p>
      </div>
    );
  const ok = r.eligible;
  const title = ok
    ? r.outcome === "valid"
      ? "Étudiant vérifié"
      : "Offre accordée"
    : r.outcome === "unverified"
      ? "Statut étudiant non vérifié"
      : r.outcome === "expired"
        ? "Carte expirée"
        : "Carte désactivée";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]",
        ok ? "bg-mint-500 text-white" : r.outcome === "unverified" ? "bg-mango-400 text-ink" : "bg-coral-500 text-white",
      )}
      role="status"
    >
      <div className="flex items-center gap-3 p-5">
        {ok ? <BadgeCheck className="size-12 shrink-0" aria-hidden /> : <ShieldAlert className="size-12 shrink-0" aria-hidden />}
        <div className="min-w-0">
          <p className="text-2xl leading-tight font-extrabold">{ok ? `✅ ${title}` : title}</p>
          <p className="text-sm opacity-90">
            {ok
              ? r.deal_title
                ? `Tu peux appliquer : ${r.deal_title}`
                : "Tu peux appliquer le tarif étudiant."
              : r.outcome === "unverified"
                ? "Inscrit sur Uny, mais son justificatif n'a pas encore été validé."
                : "Ne pas appliquer la réduction."}
          </p>
        </div>
      </div>
      <div className="text-ink flex gap-4 bg-white p-5">
        <div className="bg-canvas relative size-24 shrink-0 overflow-hidden rounded-2xl">
          {r.avatar_url ? (
            <Image src={r.avatar_url} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="text-muted flex h-full items-center justify-center text-3xl font-extrabold">
              {(r.first_name?.[0] ?? "") + (r.last_name?.[0] ?? "")}
            </span>
          )}
        </div>
        <dl className="min-w-0 space-y-0.5 text-sm">
          <dt className="sr-only">Nom</dt>
          <dd className="text-lg leading-tight font-extrabold">
            {r.first_name} {r.last_name}
          </dd>
          <dt className="sr-only">Établissement</dt>
          <dd className="text-muted">{r.university ?? "Établissement non renseigné"}</dd>
          {r.field_of_study && <dd className="text-muted">{r.field_of_study}</dd>}
          <dd className="font-mono text-xs font-semibold">
            {r.uny_id} · {r.academic_year}
          </dd>
          <dd className="text-muted text-xs">Valable jusqu&apos;au {formatDate(r.expires_at)}</dd>
        </dl>
      </div>
      {ok && (r.uses_today ?? 0) > 0 && (
        <p className="bg-mango-50 text-mango-700 px-5 py-3 text-sm font-semibold">
          ⚠️ Déjà utilisée {r.uses_today} fois aujourd&apos;hui pour cette offre.
        </p>
      )}
      <p className="text-muted bg-white px-5 pb-4 text-xs">
        Compare la photo avec la personne en face de toi. Sur la carte présentée, l&apos;heure doit défiler en direct.
      </p>
    </div>
  );
}

export function Scanner({ deals }: { deals: Deal[] }) {
  const [state, action, pending] = useActionState<ValidateState, FormData>(validateCard, {});
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [camError, setCamError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const scanner = useRef<QrScannerType | null>(null);
  const [dismissed, setDismissed] = useState<number | undefined>();
  // Offre choisie : conservée d'un scan à l'autre (le formulaire est réinitialisé après chaque envoi)
  const [dealId, setDealId] = useState("");

  const showResult = !!(state.result || state.error) && !pending && state.at !== dismissed;

  useEffect(() => {
    if (mode !== "camera" || !scanning || !video.current) return;
    let cancelled = false;
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (cancelled || !video.current) return;
        const s = new QrScanner(
          video.current,
          (res) => {
            if (!codeInput.current || !form.current) return;
            s.stop();
            setScanning(false);
            codeInput.current.value = res.data;
            form.current.requestSubmit();
          },
          { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 8 },
        );
        scanner.current = s;
        await s.start();
        setCamError(null);
      } catch {
        if (!cancelled) setCamError("Caméra indisponible. Autorise l'accès à la caméra, ou saisis le numéro de la carte.");
      }
    })();
    return () => {
      cancelled = true;
      scanner.current?.stop();
      scanner.current?.destroy();
      scanner.current = null;
    };
  }, [mode, scanning]);

  function again() {
    setDismissed(state.at);
    if (codeInput.current) codeInput.current.value = "";
    setScanning(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form ref={form} action={action} className="space-y-4">
      {deals.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Offre utilisée (facultatif)</span>
          <Select name="deal_id" value={dealId} onChange={(e) => setDealId(e.target.value)}>
            <option value="">Vérification simple du statut étudiant</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.discount_label} · {d.title}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div className="bg-canvas grid grid-cols-2 gap-1 rounded-2xl p-1" role="tablist" aria-label="Méthode">
        {(
          [
            ["camera", "Scanner le QR", Camera],
            ["manual", "Saisir le numéro", Keyboard],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setScanning(true);
              setDismissed(state.at);
            }}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
              mode === m ? "text-ink bg-white shadow-sm" : "text-muted",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
        <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-black", !scanning && "hidden")}>
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <CameraOff className="size-10" aria-hidden />
              <p className="text-sm">{camError}</p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="text-ink h-10 rounded-xl bg-white px-4 text-sm font-semibold"
              >
                Saisir le numéro
              </button>
            </div>
          )}
          <input ref={codeInput} type="hidden" name="code" />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            ref={codeInput}
            name="code"
            placeholder="UNY-GN-2026-7K3QXN"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Numéro de carte Uny"
            className="flex-1 font-mono uppercase"
            required
          />
          <button
            className="bg-brand-600 h-12 shrink-0 rounded-2xl px-5 font-semibold text-white disabled:opacity-60"
            disabled={pending}
          >
            Vérifier
          </button>
        </div>
      )}

      {pending && (
        <p className="text-muted flex items-center justify-center gap-2 py-6 text-sm font-semibold">
          <Loader2 className="size-5 animate-spin" aria-hidden /> Vérification…
        </p>
      )}

      {showResult && (
        <div key={state.at} className="animate-fade-up space-y-3">
          {state.error ? (
            <div className="bg-coral-50 text-coral-600 rounded-2xl p-4 text-sm font-semibold" role="alert">
              {state.error}
            </div>
          ) : (
            state.result && <Verdict r={state.result} />
          )}
          <button
            type="button"
            onClick={again}
            className="bg-ink flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white"
          >
            <RotateCcw className="size-4" aria-hidden />{" "}
            {mode === "camera" ? "Scanner une autre carte" : "Vérifier une autre carte"}
          </button>
        </div>
      )}
    </form>
  );
}
