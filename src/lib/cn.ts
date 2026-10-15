import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [(v: string) => /^\[\d/.test(v)] }] } },
});

/** Combine des classes Tailwind en résolvant les conflits (la dernière classe l'emporte). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
