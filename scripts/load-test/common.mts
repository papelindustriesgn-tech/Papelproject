export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const APP_URL = process.env.LOAD_APP_URL ?? "http://localhost:3000";
export const TEST_DOMAIN = "loadtest.uny.test";
export const TEST_PASSWORD = "LoadTest2026!";
export const testEmail = (i: number) => `synthetique.${String(i).padStart(4, "0")}@${TEST_DOMAIN}`;

/** Exécute des tâches avec une concurrence limitée. */
export async function pool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

export function stats(ms: number[]) {
  const s = [...ms].sort((a, b) => a - b);
  const q = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0);
  return {
    count: s.length,
    p50: Math.round(q(50)),
    p95: Math.round(q(95)),
    p99: Math.round(q(99)),
    max: Math.round(s[s.length - 1] ?? 0),
    avg: Math.round(s.reduce((a, b) => a + b, 0) / (s.length || 1)),
  };
}

/** Reproduit le cookie de session posé par @supabase/ssr (avec découpage en morceaux). */
export function ssrCookie(session: unknown) {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const MAX = 3180;
  if (value.length <= MAX) return `${key}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * MAX < value.length; i++) parts.push(`${key}.${i}=${value.slice(i * MAX, (i + 1) * MAX)}`);
  return parts.join("; ");
}
