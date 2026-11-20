import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const registryJsonPath = path.join(rootDir, "registry.json");
const registryJsPath = path.join(rootDir, "functions", "_lib", "registry.js");

const raw = fs.readFileSync(registryJsonPath, "utf8");
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`[sync-registry] Invalid JSON in registry.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(parsed)) {
  console.error("[sync-registry] registry.json must contain a top-level JSON array.");
  process.exit(1);
}

const banner = [
  "// Auto-synced from root registry.json by scripts/sync-registry.js (Wrangler 3 / esbuild compatible ESM).",
  "// Edit root registry.json to add or remove GitHub app repositories; `npm run build` keeps this file in sync."
].join("\n");

const output = `${banner}\nexport default ${JSON.stringify(parsed, null, 2)};\n`;
fs.writeFileSync(registryJsPath, output, "utf8");
console.log(`[sync-registry] Synced ${parsed.length} registry entr${parsed.length === 1 ? "y" : "ies"} -> functions/_lib/registry.js`);
