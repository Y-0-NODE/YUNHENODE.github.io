const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const source = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "local-media-source");
const outputDir = path.join(root, "assets", "local-gallery");
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "local-gallery.json");

const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const videoExts = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const maxVideoBytes = 50 * 1024 * 1024;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return String(value || "work")
    .normalize("NFKD")
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "work";
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function uniqueOutputName(base, ext) {
  let name = `${base}${ext}`;
  let i = 2;
  while (fs.existsSync(path.join(outputDir, name))) {
    name = `${base}-${i}${ext}`;
    i += 1;
  }
  return name;
}

function readSidecar(file) {
  const parsed = path.parse(file);
  const txt = path.join(parsed.dir, `${parsed.name}.txt`);
  if (!fs.existsSync(txt)) return {};

  const lines = fs.readFileSync(txt, "utf8").split(/\r?\n/);
  const meta = {};
  for (const line of lines) {
    const match = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "title" || key === "标题") meta.title = value;
    if (key === "description" || key === "说明") meta.description = value;
    if (key === "type" || key === "类型") meta.type = value;
  }
  return meta;
}

function convertImage(file, titleBase) {
  const name = uniqueOutputName(slugify(titleBase), ".jpg");
  const dest = path.join(outputDir, name);

  execFileSync("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "82",
    "--resampleHeightWidthMax", "1800",
    file,
    "--out",
    dest
  ], { stdio: "ignore" });

  return `assets/local-gallery/${name}`;
}

function copyVideo(file, titleBase) {
  const ext = path.extname(file).toLowerCase();
  const name = uniqueOutputName(slugify(titleBase), ext);
  const dest = path.join(outputDir, name);
  fs.copyFileSync(file, dest);
  return `assets/local-gallery/${name}`;
}

function main() {
  ensureDir(outputDir);
  ensureDir(dataDir);

  if (!fs.existsSync(source)) {
    ensureDir(source);
    console.log(`已创建本地作品源文件夹：${source}`);
    console.log("把照片放进去后，再运行同一个命令。");
    fs.writeFileSync(dataFile, "[]\n");
    return;
  }

  const items = [];
  const files = walk(source).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExts.has(ext) || videoExts.has(ext);
  });

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    const parsed = path.parse(file);
    const meta = readSidecar(file);
    const title = meta.title || parsed.name;
    const description = meta.description || "";
    const createdAt = stat.birthtime || stat.mtime;

    if (imageExts.has(ext)) {
      const url = convertImage(file, title);
      items.push({
        title,
        description,
        kind: "photo",
        url,
        source: "local-folder",
        created_at: createdAt.toISOString()
      });
      continue;
    }

    if (videoExts.has(ext)) {
      if (stat.size > maxVideoBytes) {
        console.log(`跳过大视频：${file}，超过 50MB。建议放视频平台，网站保存链接。`);
        continue;
      }

      const url = copyVideo(file, title);
      items.push({
        title,
        description,
        kind: "video",
        url,
        source: "local-folder",
        created_at: createdAt.toISOString()
      });
    }
  }

  items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  fs.writeFileSync(dataFile, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`已生成 ${items.length} 个本地作品。`);
  console.log(`作品文件夹：${outputDir}`);
  console.log(`作品清单：${dataFile}`);
}

main();
