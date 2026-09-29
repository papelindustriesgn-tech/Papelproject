import NextImage, { type ImageProps } from "next/image";
import { safeImage } from "@/lib/images";

/** next/image restreint aux hébergeurs autorisés : une URL inconnue n'affiche rien au lieu de faire planter la page. */
export default function SafeImage({ src, alt, ...props }: ImageProps) {
  const url = typeof src === "string" ? safeImage(src) : src;
  if (!url) return null;
  return <NextImage src={url} alt={alt} {...props} />;
}
