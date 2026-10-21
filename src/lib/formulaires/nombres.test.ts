import { describe, expect, it } from "vitest";
import { lireNombre, versPourcentage } from "./nombres";

describe("saisie des nombres", () => {
  it("accepte les formats français", () => {
    expect(lireNombre("9 450")).toBe(9450);
    expect(lireNombre("0,05")).toBe(0.05);
    expect(lireNombre(" 12.5 ")).toBe(12.5);
  });
  it("refuse le texte", () => {
    expect(lireNombre("abc")).toBeNull();
    expect(lireNombre("")).toBeNull();
    expect(lireNombre("1,2,3")).toBeNull();
    expect(lireNombre(null)).toBeNull();
  });
  it("pourcentage lisible", () => {
    expect(versPourcentage(0.05)).toBe("5");
    expect(versPourcentage(0.045)).toBe("4,5");
  });
});
