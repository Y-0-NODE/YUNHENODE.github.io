const fs = require("fs");
const path = require("path");

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

for (const directory of [
  "assets/styles",
  "scripts/core",
  "scripts/pages",
  "shared",
  "lib/services",
  "database/migrations",
  "legacy"
]) {
  if (!fs.existsSync(path.join(root, directory))) failures.push(`Missing directory: ${directory}`);
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
