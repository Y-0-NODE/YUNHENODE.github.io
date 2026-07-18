const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "api");
const failures = [];

function listFiles(dir, predicate) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "legacy"].includes(entry.name)) return [];
      return listFiles(file, predicate);
    }
    return predicate(file) ? [file] : [];
  });
}

const apiFiles = listFiles(apiDir, file => file.endsWith(".js"));
if (apiFiles.length > 12) failures.push(`Serverless functions: ${apiFiles.length} (maximum 12)`);
const apiHashes = new Map();
for (const file of apiFiles) {
  const hash = crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
  if (apiHashes.has(hash)) {
    failures.push(
      `Duplicate API implementation: ${path.basename(apiHashes.get(hash))} and ${path.basename(file)}`
    );
  }
  apiHashes.set(hash, file);
}

for (const directory of [
  "assets/styles",
  "admin",
  "scripts/core",
  "scripts/pages",
  "shared",
  "lib/services",
  "database/migrations",
  "legacy",
  "pages"
]) {
  if (!fs.existsSync(path.join(root, directory))) failures.push(`Missing directory: ${directory}`);
}

const legacyManifest = JSON.parse(fs.readFileSync(path.join(root, "legacy/manifest.json"), "utf8"));
for (const retired of [
  ...(legacyManifest.archivedPages || []),
  ...(legacyManifest.archivedTemplates || [])
]) {
  if (fs.existsSync(path.join(root, retired)))
    failures.push(`Retired file still active: ${retired}`);
}

for (const file of listFiles(root, file => file.endsWith(".js"))) {
  try {
    new Function(fs.readFileSync(file, "utf8"));
  } catch (error) {
    // CommonJS files can contain top-level constructs that new Function still accepts;
    // report the exact file if syntax parsing fails.
    failures.push(`${path.relative(root, file)}: ${error.message}`);
  }
}

for (const file of listFiles(root, file => file.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  if (/<style(?:\s[^>]*)?>/i.test(html)) failures.push(`${relative}: inline <style> block`);
  if (/<script>([\s\S]*?)<\/script>/i.test(html))
    failures.push(`${relative}: inline <script> block`);
  for (const match of html.matchAll(/href=["']([^"'#?]+\.html)(?:[?#][^"']*)?["']/g)) {
    if (/^(?:https?:|\/\/)/.test(match[1])) continue;
    if (!fs.existsSync(path.join(root, match[1]))) {
      failures.push(`${relative} -> missing ${match[1]}`);
    }
  }
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)) {
    const asset = match[1];
    if (!/^(?:https?:|\/\/)/.test(asset) && !fs.existsSync(path.join(root, asset))) {
      failures.push(`${relative} -> missing ${asset}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Project check passed. ${apiFiles.length} Serverless functions.`);
