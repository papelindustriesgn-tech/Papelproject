/** Clé unique d'une saisie (idempotence côté base : un double envoi ne crée pas deux enregistrements). */
export function nouvelleCle(): string {
  return crypto.randomUUID();
}
