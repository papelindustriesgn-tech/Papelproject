import { describe, expect, it } from "vitest";
import { versCsv } from "./csv";

describe("export CSV pour Excel", () => {
  it("séparateur point-virgule, BOM, virgule décimale, échappement", () => {
    const csv = versCsv(["Article", "Quantité", "Actif"], [["Film ; Petit", 12.5, true], ['Carton "50"', 3, false], [null, 0, null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Article;Quantité;Actif",
      '"Film ; Petit";12,5;oui',
      '"Carton ""50""";3;non',
      ";0;",
    ]);
  });
});
