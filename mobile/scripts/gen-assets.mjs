// Génère les images sources des icônes et écrans de démarrage (mobile/assets/),
// ensuite déclinées dans toutes les tailles Android/iOS par `capacitor-assets generate`.
// Utilise le Chromium de Playwright installé à la racine du dépôt.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const MARK = (stroke = "#fff") =>
  `<path d="M14 14v11a10 10 0 0 0 20 0V14" fill="none" stroke="${stroke}" stroke-width="5.5" stroke-linecap="round"/><circle cx="36.5" cy="36.5" r="4.5" fill="#ffb23f"/>`;

fs.mkdirSync("assets", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage();

async function shot(name, size, html, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `assets/${name}.png`, omitBackground: transparent });
}

// Icône complète (iOS + Android anciennes versions) : fond violet plein, pas de coins arrondis (le système les applique).
await shot(
  "icon-only",
  1024,
  `<svg width="1024" height="1024" viewBox="0 0 48 48"><rect width="48" height="48" fill="#5733f0"/><g transform="translate(6 6) scale(0.75)">${MARK()}</g></svg>`,
);
// Icône adaptative Android : premier plan dans la zone de sécurité (66 %), fond séparé.
await shot(
  "icon-foreground",
  1024,
  `<svg width="1024" height="1024" viewBox="0 0 48 48"><g transform="translate(12 12) scale(0.5)">${MARK()}</g></svg>`,
  true,
);
await shot("icon-background", 1024, `<div style="width:1024px;height:1024px;background:#5733f0"></div>`);

const splash = (bg) =>
  `<div style="width:2732px;height:2732px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
  <svg width="360" height="360" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#fff"/>${MARK("#5733f0")}</svg>
  <div style="color:#fff;font-size:150px;font-weight:800;letter-spacing:-5px">uny<span style="color:#ffb23f">.</span></div></div>`;
await shot("splash", 2732, splash("#5733f0"));
await shot("splash-dark", 2732, splash("#170c45"));

await browser.close();
console.log("Images sources générées dans mobile/assets/");
