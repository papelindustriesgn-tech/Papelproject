import { describe, expect, it } from "vitest";
import { classerClients } from "./clients";

const c = (id: string, caHtGnf: number) => ({ id, caHtGnf, nom: `Client ${id}` });

describe("classerClients", () => {
  it("classe par CA, calcule la part, l'évolution et regroupe le reste", () => {
    const r = classerClients([c("a", 500), c("b", 300), c("c", 100), c("d", 100), c("e", 0), c("f", -50)], [c("a", 250), c("c", 200)], 2);
    expect(r.totalGnf).toBe(1000); // e (0) et f (avoir net) ne sont pas classés
    expect(r.premiers.map((x) => [x.client.id, x.rang, x.part])).toEqual([
      ["a", 1, 0.5],
      ["b", 2, 0.3],
    ]);
    expect(r.premiers[0].evolution).toBe(1); // 250 → 500 : +100 %
    expect(r.premiers[1].evolution).toBeNull(); // b : nouveau client sur la période
    expect(r.autres).toEqual({ nombre: 2, caHtGnf: 200, part: 0.2 });
    expect(r.partCinqPremiers).toBe(1);
  });

  it("baisse d'un client : évolution négative", () => {
    const r = classerClients([c("a", 100)], [c("a", 400)]);
    expect(r.premiers[0].evolution).toBe(-0.75);
  });

  it("sans vente : liste vide, pas de concentration", () => {
    const r = classerClients([], []);
    expect(r.premiers).toEqual([]);
    expect(r.partCinqPremiers).toBeNull();
    expect(r.autres).toEqual({ nombre: 0, caHtGnf: 0, part: 0 });
  });
});
