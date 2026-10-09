import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import { expect, test } from "@playwright/test";
import { ADMIN, adminAsPartnerMember, login, serviceRest, signUp } from "./helpers";

/**
 * Scan réel par la caméra : Chromium reçoit une fausse caméra qui filme le QR code d'une carte Uny
 * (vidéo .y4m générée à partir du lien /v/<jeton> de la carte d'un étudiant vérifié).
 */
const VIDEO = path.resolve("test-results/fake-camera-qr.y4m");

test.use({
  permissions: ["camera"],
  launchOptions: {
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${VIDEO}`],
  },
});

async function writeQrVideo(text: string) {
  const W = 640;
  const H = 480;
  const png = PNG.sync.read(await QRCode.toBuffer(text, { width: 360, margin: 2 }));
  const y = Buffer.alloc(W * H, 235);
  const ox = (W - png.width) >> 1;
  const oy = (H - png.height) >> 1;
  for (let r = 0; r < png.height; r++)
    for (let c = 0; c < png.width; c++) y[(oy + r) * W + ox + c] = png.data[(r * png.width + c) * 4];
  const uv = Buffer.alloc((W / 2) * (H / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), y, uv, uv]);
  fs.mkdirSync(path.dirname(VIDEO), { recursive: true });
  fs.writeFileSync(
    VIDEO,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(frame)]),
  );
}

test.beforeAll(async ({ browser }) => {
  await adminAsPartnerMember();
  // Étudiant vérifié dont on filme la carte
  const page = await browser.newPage();
  const s = await signUp(page);
  const [p] = await (await serviceRest(`profiles?email=eq.${s.email}&select=id`)).json();
  await serviceRest(`profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ verification_status: "verified" }) });
  const [card] = await (await serviceRest(`student_cards?user_id=eq.${p.id}&select=qr_token`)).json();
  await writeQrVideo(`http://localhost:3000/v/${card.qr_token}`);
  await page.close();
});

test("scanner : la caméra lit le QR code de la carte et valide l'étudiant", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/partenaire/scanner");
  await expect(page.getByRole("status")).toContainText("Étudiant vérifié", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Scanner une autre carte" })).toBeVisible();
});
