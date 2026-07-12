const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "work";
}

function fileHash(file) {
  return crypto
    .createHash("sha1")
    .update(fs.readFileSync(file))
    .digest("hex")
    .slice(0, 12);
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

function outputName(file, titleBase, suffix, ext) {
  const base = slugify(titleBase);
  return `${base}-${fileHash(file)}${suffix}${ext}`;
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
    if (key === "shot_at" || key === "shooting_date" || key === "拍摄日期") meta.shot_at = value;
    if (key === "hidden" || key === "hide" || key === "隐藏") {
      meta.hidden = /^(true|yes|1|是|隐藏)$/i.test(value);
    }
    if (key === "delete" || key === "deleted" || key === "删除") {
      meta.hidden = /^(true|yes|1|是|删除|隐藏)$/i.test(value);
    }
  }
  return meta;
}

function convertImage(file, titleBase) {
  const thumbName = outputName(file, titleBase, "-thumb", ".jpg");
  const largeName = outputName(file, titleBase, "-large", ".jpg");
  const thumbDest = path.join(outputDir, thumbName);
  const largeDest = path.join(outputDir, largeName);

  execFileSync("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "78",
    "--resampleHeightWidthMax", "1200",
    file,
    "--out",
    thumbDest
  ], { stdio: "ignore" });

  execFileSync("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "88",
    "--resampleHeightWidthMax", "4096",
    file,
    "--out",
    largeDest
  ], { stdio: "ignore" });

  return {
    url: `assets/local-gallery/${thumbName}`,
    large_url: `assets/local-gallery/${largeName}`
  };
}

function copyVideo(file, titleBase) {
  const ext = path.extname(file).toLowerCase();
  const name = outputName(file, titleBase, "", ext);
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
    if (meta.hidden) {
      console.log(`跳过隐藏作品：${file}`);
      continue;
    }
    const title = meta.title || parsed.name;
    const description = meta.description || "";
    const createdAt = stat.birthtime || stat.mtime;
    const shotAt = meta.shot_at || "";

    if (imageExts.has(ext)) {
      const image = convertImage(file, title);
      items.push({
        title,
        description,
        kind: "photo",
        url: image.url,
        large_url: image.large_url,
        sidecar_name: `${parsed.name}.txt`,
        source: "local-folder",
        created_at: createdAt.toISOString(),
        shot_at: shotAt
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
        sidecar_name: `${parsed.name}.txt`,
        source: "local-folder",
        created_at: createdAt.toISOString(),
        shot_at: shotAt
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
