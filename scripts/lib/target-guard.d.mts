export const PRODUCTION_SUPABASE_REF: string;
export function isProductionTarget(url: string | undefined): boolean;
export function assertNonProductionTarget(urls: (string | undefined)[], context: string): void;
