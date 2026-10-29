/**
 * Classement des plus gros clients d'une période (fonction pure, testée) : part du chiffre d'affaires,
 * évolution par rapport à la période précédente, poids des 5 premiers (risque de dépendance), reste regroupé.
 */

export interface VentesDuClient {
  id: string;
  caHtGnf: number;
}

export interface ClientClasse<T extends VentesDuClient> {
  client: T;
  rang: number;
  /** Part du CA HT de la période (0 à 1). */
  part: number;
  /** Évolution relative du CA par rapport à la période précédente ; null = nouveau client (rien avant). */
  evolution: number | null;
  caPrecedentGnf: number;
}

export interface Classement<T extends VentesDuClient> {
  premiers: ClientClasse<T>[];
  /** Clients au-delà du classement, regroupés. */
  autres: { nombre: number; caHtGnf: number; part: number };
  /** Part du CA faite par les 5 premiers clients (concentration), null sans CA. */
  partCinqPremiers: number | null;
  totalGnf: number;
}

/**
 * Classe les clients par CA HT décroissant (net des avoirs) ; un client dont le CA net est nul ou négatif n'est pas classé.
 * `precedent` : CA HT de chaque client sur la période précédente de même durée.
 */
export function classerClients<T extends VentesDuClient>(clients: T[], precedent: VentesDuClient[], nombre = 10): Classement<T> {
  const avant = new Map(precedent.map((c) => [c.id, c.caHtGnf]));
  const tries = clients.filter((c) => c.caHtGnf > 0).sort((a, b) => b.caHtGnf - a.caHtGnf || a.id.localeCompare(b.id));
  const total = tries.reduce((t, c) => t + c.caHtGnf, 0);
  const part = (ca: number) => (total > 0 ? ca / total : 0);
  const premiers = tries.slice(0, nombre).map((client, i) => {
    const caPrecedentGnf = avant.get(client.id) ?? 0;
    return { client, rang: i + 1, part: part(client.caHtGnf), evolution: caPrecedentGnf > 0 ? (client.caHtGnf - caPrecedentGnf) / caPrecedentGnf : null, caPrecedentGnf };
  });
  const reste = tries.slice(nombre);
  const caAutres = reste.reduce((t, c) => t + c.caHtGnf, 0);
  return {
    premiers,
    autres: { nombre: reste.length, caHtGnf: caAutres, part: part(caAutres) },
    partCinqPremiers: total > 0 ? tries.slice(0, 5).reduce((t, c) => t + c.caHtGnf, 0) / total : null,
    totalGnf: total,
  };
}
