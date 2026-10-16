"use client";

/**
 * Contexte de l'application terrain : base locale, client Supabase, état réseau et synchronisation,
 * navigation interne par « # » (fonctionne hors ligne et avec le bouton retour d'Android).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientNavigateur } from "@/lib/supabase/navigateur";
import { baseTerrain, type BaseTerrain } from "@/lib/terrain/base-locale";
import { synchroniser, type BilanSynchronisation } from "@/lib/terrain/synchronisation";

export interface Route {
  vue: string;
  id?: string;
  params: URLSearchParams;
}

interface ContexteTerrain {
  base: BaseTerrain;
  utilisateurId: string;
  enLigne: boolean;
  synchronisation: { enCours: boolean; erreur: string | null; bilan: BilanSynchronisation | null };
  lancerSynchronisation: () => Promise<void>;
  route: Route;
  aller: (chemin: string) => void;
}

const Contexte = createContext<ContexteTerrain | null>(null);

function lireRoute(): Route {
  const brut = typeof window === "undefined" ? "" : window.location.hash.replace(/^#\/?/, "");
  const [chemin, requete = ""] = brut.split("?");
  const [vue = "accueil", id] = chemin.split("/");
  return { vue: vue || "accueil", id, params: new URLSearchParams(requete) };
}

export function FournisseurTerrain({ utilisateurId, children }: { utilisateurId: string; children: ReactNode }) {
  const base = useMemo(() => baseTerrain(utilisateurId), [utilisateurId]);
  const supabase = useMemo(() => clientNavigateur(), []);
  const [enLigne, setEnLigne] = useState(true);
  const [route, setRoute] = useState<Route>({ vue: "accueil", params: new URLSearchParams() });
  const [synchronisation, setSynchronisation] = useState<ContexteTerrain["synchronisation"]>({ enCours: false, erreur: null, bilan: null });

  const lancerSynchronisation = useCallback(async () => {
    setSynchronisation((s) => ({ ...s, enCours: true, erreur: null }));
    try {
      const bilan = await synchroniser(base, supabase, utilisateurId);
      setSynchronisation({ enCours: false, erreur: null, bilan });
    } catch (e) {
      setSynchronisation((s) => ({ ...s, enCours: false, erreur: e instanceof Error ? e.message : "Synchronisation impossible." }));
    }
  }, [base, supabase, utilisateurId]);

  // Réseau : synchronisation au démarrage, au retour du réseau et toutes les 5 minutes.
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    const retour = () => {
      maj();
      void lancerSynchronisation();
    };
    maj();
    window.addEventListener("online", retour);
    window.addEventListener("offline", maj);
    if (navigator.onLine) void lancerSynchronisation();
    const minuterie = window.setInterval(() => navigator.onLine && void lancerSynchronisation(), 5 * 60_000);
    return () => {
      window.removeEventListener("online", retour);
      window.removeEventListener("offline", maj);
      window.clearInterval(minuterie);
    };
  }, [lancerSynchronisation]);

  // Navigation par « # »
  useEffect(() => {
    const maj = () => {
      setRoute(lireRoute());
      window.scrollTo(0, 0);
    };
    maj();
    window.addEventListener("hashchange", maj);
    return () => window.removeEventListener("hashchange", maj);
  }, []);

  // Service worker : ouverture de l'application sans réseau.
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const aller = useCallback((chemin: string) => {
    window.location.hash = chemin;
  }, []);

  const valeur = useMemo(
    () => ({ base, utilisateurId, enLigne, synchronisation, lancerSynchronisation, route, aller }),
    [base, utilisateurId, enLigne, synchronisation, lancerSynchronisation, route, aller],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useTerrain(): ContexteTerrain {
  const c = useContext(Contexte);
  if (!c) throw new Error("useTerrain doit être utilisé dans FournisseurTerrain.");
  return c;
}
