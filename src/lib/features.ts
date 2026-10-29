/**
 * Rubriques optionnelles. Uny est recentrée sur les offres (façon UNiDAYS) : jobs, logement et marketplace sont
 * masqués par défaut (pages redirigées, liens retirés). Les données sont conservées ; pour les réactiver,
 * définir NEXT_PUBLIC_UNY_OPPORTUNITES=1 puis reconstruire l'application.
 */
export const OPPORTUNITIES_ENABLED = process.env.NEXT_PUBLIC_UNY_OPPORTUNITES === "1";
