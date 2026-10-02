/** Chemin de redirection avec message de succès (affiché par le bandeau de la coque). */
export function avecSucces(chemin: string, message: string): string {
  return `${chemin}${chemin.includes("?") ? "&" : "?"}succes=${encodeURIComponent(message)}`;
}
