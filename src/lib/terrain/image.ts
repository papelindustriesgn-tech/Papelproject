/** Compression des photos avant envoi (réseau lent) : JPEG, plus grand côté ≤ 1 280 px. */

export const COTE_MAX_PX = 1280;

/** Dimensions réduites en conservant les proportions (jamais d'agrandissement). */
export function dimensionsCible(largeur: number, hauteur: number, coteMax = COTE_MAX_PX): { largeur: number; hauteur: number } {
  if (largeur <= 0 || hauteur <= 0) throw new Error("Image invalide.");
  const ratio = Math.min(1, coteMax / Math.max(largeur, hauteur));
  return { largeur: Math.round(largeur * ratio), hauteur: Math.round(hauteur * ratio) };
}

/** Compresse une photo prise par le téléphone (≈ 100 à 250 Ko). */
export async function compresserPhoto(fichier: Blob, qualite = 0.7): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const { largeur, hauteur } = dimensionsCible(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  canvas.getContext("2d")!.drawImage(image, 0, 0, largeur, hauteur);
  image.close();
  return new Promise((resoudre, rejeter) => canvas.toBlob((b) => (b ? resoudre(b) : rejeter(new Error("Compression impossible."))), "image/jpeg", qualite));
}
