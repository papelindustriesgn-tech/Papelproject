import { describe, expect, it } from "vitest";
import { gnfCourt } from "./libelles";

describe("gnfCourt", () => {
  it("raccourcit les millions et milliards, garde les petits montants exacts", () => {
    expect(gnfCourt(16_848_857)).toBe("16,8 M GNF");
    expect(gnfCourt(1_249_170)).toBe("1,25 M GNF");
    expect(gnfCourt(587_947_311)).toBe("587,9 M GNF");
    expect(gnfCourt(2_104_000_000)).toBe("2,1 Md GNF");
    expect(gnfCourt(3942)).toBe("3 942 GNF");
  });
  it("garde le signe d'une perte", () => {
    expect(gnfCourt(-3_576_337_698)).toBe("-3,58 Md GNF");
    expect(gnfCourt(null)).toBe("0 GNF");
  });
});
