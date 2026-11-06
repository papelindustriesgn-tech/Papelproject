/** Génère un CSV compatible Excel (séparateur « ; », BOM UTF-8, protection contre l'injection de formules). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    let s = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(escape).join(";"));
  return "﻿" + lines.join("\r\n");
}
