import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const packageJsonPath = resolve(root, "package.json");
const manifestPath = resolve(root, "public/manifest.json");
const versionTsPath = resolve(root, "src/version.ts");

function readJson(filePath: string): JsonObject {
  return JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
}

function writeIfChanged(filePath: string, content: string): boolean {
  const current = readFileSync(filePath, "utf8");
  if (current === content) return false;

  writeFileSync(filePath, content, "utf8");
  return true;
}

const packageJson = readJson(packageJsonPath);
const version = packageJson.version;

if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(
    `Invalid version "${String(version)}". Expected format: x.y.z`,
  );
}

const manifest = readJson(manifestPath);
const nextManifest = {
  ...manifest,
  version,
};
const manifestContent = `${JSON.stringify(nextManifest, null, 2)}\n`;

const versionTsContent = `/**\n * Extension version - managed via package.json\n */\nexport const EXTRACTOR_VERSION = "${version}";\n`;

const changedManifest = writeIfChanged(manifestPath, manifestContent);
const changedVersionTs = writeIfChanged(versionTsPath, versionTsContent);

if (changedManifest || changedVersionTs) {
  console.log(
    `Synced version ${version} to public/manifest.json and src/version.ts`,
  );
} else {
  console.log(`Version already in sync (${version})`);
}
