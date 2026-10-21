"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/** Client Supabase côté navigateur (composants client, application terrain). La RLS s'applique. */
export function clientNavigateur() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
