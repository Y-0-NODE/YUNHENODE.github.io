const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const scriptsDir = path.join(root, "scripts/pages");
const stylesDir = path.join(root, "assets/styles/pages");

fs.mkdirSync(scriptsDir, { recursive: true });
fs.mkdirSync(stylesDir, { recursive: true });

function targetName(base, index, count, extension) {
  return count === 1 ? `${base}.${extension}` : `${base}-${index + 1}.${extension}`;
}

for (const filename of fs.readdirSync(root).filter(name => name.endsWith(".html"))) {
  const file = path.join(root, filename);
  const base = path.basename(filename, ".html");
  let html = fs.readFileSync(file, "utf8");

  const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  styleBlocks.forEach((match, index) => {
    const name = targetName(base, index, styleBlocks.length, "css");
    fs.writeFileSync(path.join(stylesDir, name), `${match[1].trim()}\n`);
    html = html.replace(match[0], `<link rel="stylesheet" href="assets/styles/pages/${name}">`);
  });

  const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  scriptBlocks.forEach((match, index) => {
    const name = targetName(base, index, scriptBlocks.length, "js");
    fs.writeFileSync(path.join(scriptsDir, name), `${match[1].trim()}\n`);
    html = html.replace(match[0], `<script src="scripts/pages/${name}"></script>`);
  });

  fs.writeFileSync(file, html);
}

console.log("Inline page styles and scripts extracted.");
