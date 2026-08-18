import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const root = process.cwd();
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const manifest = JSON.parse(await read("manifest.json"));
check(manifest.name === "Block Mosaic", "manifest name must be Block Mosaic");
check(typeof manifest.id === "string" && manifest.id.length > 0, "manifest id is required");
check(manifest.api === "1.0.0", "manifest api must be 1.0.0");
check(manifest.documentAccess === "dynamic-page", "dynamic-page document access is required");
check(Array.isArray(manifest.editorType) && manifest.editorType.includes("figma"), "figma editor type is required");
check(manifest.networkAccess?.allowedDomains?.[0] === "none", "network access must remain disabled");

for (const field of ["main", "ui"]) {
  check(typeof manifest[field] === "string", `manifest ${field} must be a file path`);
  if (typeof manifest[field] === "string") {
    try {
      await access(path.join(root, manifest[field]));
    } catch {
      failures.push(`manifest ${field} file does not exist: ${manifest[field]}`);
    }
  }
}

const controller = await read(manifest.main);
new vm.Script(controller, { filename: manifest.main });

const ui = await read(manifest.ui);
check(ui.includes("<!doctype html>"), "ui.html must include an HTML doctype");
check(!/<fig-[a-z-]+/i.test(ui), "ui.html contains undefined fig-* custom elements");

const scripts = [...ui.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
check(scripts.length > 0, "ui.html must include an inline script");
for (const [index, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `${manifest.ui}:inline-script-${index + 1}` });
}

for (const required of [
  "README.md",
  "PUBLISHING.md",
  "PRIVACY.md",
  "LICENSE",
  "community/LISTING.md",
  "assets/plugin-icon-128.png",
  "assets/community-cover-1920x1080.png",
  "assets/github-social-preview-1280x640.png",
]) {
  try {
    await access(path.join(root, required));
  } catch {
    failures.push(`required project file does not exist: ${required}`);
  }
}

if (failures.length > 0) {
  console.error("Validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Block Mosaic project validation passed.");
}
