import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/constants";

export function cardVerificationUrl(token: string) {
  return `${SITE_URL}/v/${token}`;
}

/** QR code SVG (vectoriel, net quelle que soit la taille d'affichage). */
export async function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#15122e", light: "#ffffff" },
  });
}
