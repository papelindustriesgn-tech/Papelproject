/**
 * Liens universels iOS : les liens https://www.unyafrica.com (confirmation d'email, mot de passe oublié, carte…)
 * s'ouvrent dans l'application iPhone. Actif seulement quand APPLE_TEAM_ID (identifiant d'équipe Apple Developer,
 * 10 caractères) est défini sur Vercel ; l'application doit aussi déclarer « applinks:www.unyafrica.com ».
 */
export const dynamic = "force-static";

export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team || !/^[A-Z0-9]{10}$/.test(team)) return new Response("Not found", { status: 404 });
  return Response.json({
    applinks: {
      details: [
        {
          appIDs: [`${team}.com.unyafrica.app`],
          components: [{ "/": "/admin/*", exclude: true }, { "/": "/api/*", exclude: true }, { "/": "/*" }],
        },
      ],
    },
  });
}
