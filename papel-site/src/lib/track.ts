"use client";

export type TrackedEvent = "whatsapp_click" | "cta_click" | "phone_click" | "email_click";

/** Mesure anonyme d'un clic (sans cookie ni identifiant). N'interrompt jamais la navigation. */
export function track(type: TrackedEvent, label?: string) {
  try {
    const body = JSON.stringify({ type, label: label?.slice(0, 80), path: window.location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/evenement", new Blob([body], { type: "application/json" }));
    else void fetch("/api/evenement", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    // mesure facultative
  }
}
