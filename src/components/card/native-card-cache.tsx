"use client";

import { useEffect } from "react";

/** Données de la carte gardées par l'application iPhone/Android (Capacitor) pour l'écran hors ligne. */
export type OfflineCard = {
  firstName: string;
  lastName: string;
  university: string | null;
  unyId: string;
  academicYear: string;
  status: string;
  expiresAt: string | null;
  qrSvg: string | null;
  savedAt: string;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  Plugins?: { Preferences?: { set: (o: { key: string; value: string }) => Promise<void>; remove: (o: { key: string }) => Promise<void> } };
};

export const OFFLINE_CARD_KEY = "uny.offlineCard";

function preferences() {
  const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.Preferences : undefined;
}

/**
 * Dans l'application : enregistre la carte à chaque ouverture de « Ma carte » pour l'afficher sans réseau
 * (écran hors ligne natif). Sur le site web, ne fait rien (le service worker s'en charge).
 */
export function NativeCardCache({ card }: { card: Omit<OfflineCard, "savedAt"> }) {
  useEffect(() => {
    const prefs = preferences();
    if (!prefs) return;
    prefs.set({ key: OFFLINE_CARD_KEY, value: JSON.stringify({ ...card, savedAt: new Date().toISOString() }) }).catch(() => {});
  }, [card]);
  return null;
}

/** Déconnexion ou changement de compte : la carte gardée par l'application est effacée. */
export function forgetNativeCard() {
  preferences()
    ?.remove({ key: OFFLINE_CARD_KEY })
    .catch(() => {});
}
