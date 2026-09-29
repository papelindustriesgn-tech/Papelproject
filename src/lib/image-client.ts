/**
 * Redimensionne et compresse une image dans le navigateur avant l'envoi
 * (important pour les connexions mobiles limitées) : max 1280 px, JPEG ~80 %.
 */
export async function compressImage(file: File, maxSize = 1280, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Format non supporté");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

export function randomName(ext = "jpg") {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}
