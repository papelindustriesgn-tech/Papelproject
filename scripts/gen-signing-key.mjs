// Génère la clé de signature JWT ES256 du Supabase local (supabase/signing_keys.json, non versionnée).
import { execSync } from "node:child_process";
import fs from "node:fs";
const path = "supabase/signing_keys.json";
if (fs.existsSync(path)) {
  console.log(`${path} existe déjà.`);
  process.exit(0);
}
const out = execSync("npx supabase gen signing-key --algorithm ES256", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
const key = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
fs.writeFileSync(path, JSON.stringify([key]));
console.log(`✅ ${path} créé.`);
