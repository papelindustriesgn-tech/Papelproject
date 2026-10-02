#!/usr/bin/env bash
# Parcours de bout en bout complets : base de démonstration neuve, build de production, serveur, Playwright.
# Prérequis : Supabase local démarré (npm run db:start).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
echo "→ Réinitialisation de la base de démonstration…"
npx supabase db reset > /dev/null
echo "→ Compilation…"
npx next build > /dev/null
echo "→ Démarrage du serveur sur le port $PORT…"
npx next start -p "$PORT" > /tmp/papel-e2e-serveur.log 2>&1 &
SERVEUR=$!
trap 'kill $SERVEUR 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/connexion" && break; sleep 1; done
echo "→ Tests Playwright…"
E2E_URL="http://127.0.0.1:$PORT" npx playwright test "$@"
