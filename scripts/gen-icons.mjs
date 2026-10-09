// Génère les icônes PWA, le favicon et l'image Open Graph (nécessite Playwright/Chromium et Pillow pour le .ico).
import { chromium } from "@playwright/test";
import fs from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage();
const mark = (size, pad, radius) => `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;background:${pad ? "#5733f0" : "transparent"};display:flex;align-items:center;justify-content:center">
<svg width="${size - pad * 2}" height="${size - pad * 2}" viewBox="0 0 48 48"><rect width="48" height="48" rx="${radius}" fill="#5733f0"/><path d="M14 14v11a10 10 0 0 0 20 0V14" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><circle cx="36.5" cy="36.5" r="4.5" fill="#ffb23f"/></svg></div></body></html>`;
for (const [name, size, pad, r] of [["icon-192", 192, 0, 12], ["icon-512", 512, 0, 12], ["icon-maskable-512", 512, 80, 0], ["apple-touch-icon", 180, 0, 0], ["favicon-48", 48, 0, 12]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(mark(size, pad, r));
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
}
await p.setViewportSize({ width: 1200, height: 630 });
await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;font-family:'Plus Jakarta Sans',sans-serif">
<div style="width:1200px;height:630px;position:relative;overflow:hidden;background:linear-gradient(135deg,#2a1878,#4726cc 55%,#6a45ff);color:#fff">
<div style="position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,#ffb23f88,transparent 65%)"></div>
<div style="position:absolute;left:80px;top:80px;display:flex;align-items:center;gap:18px">
<svg width="84" height="84" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#fff"/><path d="M14 14v11a10 10 0 0 0 20 0V14" fill="none" stroke="#5733f0" stroke-width="5.5" stroke-linecap="round"/><circle cx="36.5" cy="36.5" r="4.5" fill="#ffb23f"/></svg>
<span style="font-size:64px;font-weight:800;letter-spacing:-2px">uny<span style="color:#ffb23f">.</span></span></div>
<div style="position:absolute;left:80px;top:230px;font-size:68px;font-weight:800;line-height:1.05;letter-spacing:-2px;max-width:900px">Ton statut étudiant devient un <span style="color:#ffb23f">avantage</span>.</div>
<div style="position:absolute;left:80px;bottom:80px;font-size:28px;font-weight:500;color:#e4deff">Carte étudiante digitale · Réductions · Jobs · Logement · Marketplace</div>
</div></body></html>`, { waitUntil: "networkidle" });
await p.screenshot({ path: "src/app/opengraph-image.png" });
fs.copyFileSync("src/app/opengraph-image.png", "src/app/twitter-image.png");
await b.close();
