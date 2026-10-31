import { NextResponse, type NextRequest } from "next/server";

/**
 * Lien court de vérification d'un code promo, transmis par l'étudiant (WhatsApp, SMS). Ouvre la page de
 * vérification de l'espace partenaire (connexion demandée si besoin) ; aucune donnée n'est affichée ici.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const target = /^[0-9a-f]{32}$/.test(token) ? `/partenaire/verifier/${token}` : "/";
  return NextResponse.redirect(new URL(target, request.url));
}
