const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");

const BUCKET = "media";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeFileName(name) {
  return String(name || "thought-image.jpg")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function storageHeaders(contentType) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": contentType
  };
}

async function ensureBucket(baseUrl) {
  const check = await fetch(`${baseUrl}/storage/v1/bucket/${BUCKET}`, {
    headers: storageHeaders("application/json")
  });
  if (check.ok) return;
  if (check.status !== 404) throw new Error("无法读取图片存储空间。");

  const created = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders("application/json"),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true })
  });
  if (!created.ok) throw new Error("无法创建图片存储空间。");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const match = String(body?.dataUrl || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match) return res.status(400).json({ success: false, error: "没有收到可用的图片数据。" });

    const contentType = String(body?.contentType || match[1]).toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      return res.status(400).json({ success: false, error: "手机图片请使用 JPG、PNG、WebP 或 GIF 格式。" });
    }

    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(413).json({ success: false, error: "压缩后的图片仍超过 2MB，请换一张图片。" });
    }

    const baseUrl = String(process.env.SUPABASE_URL).replace(/\/$/, "");
    await ensureBucket(baseUrl);

    const fileName = safeFileName(body?.fileName);
    const path = `thought/${Date.now()}-${fileName.replace(/\.[^.]+$/, "")}.jpg`;
    const uploaded = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: {
        ...storageHeaders(contentType),
        "x-upsert": "false"
      },
      body: buffer
    });

    if (!uploaded.ok) {
      const detail = await uploaded.text();
      throw new Error(detail || "Supabase 图片上传失败。");
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
    return res.status(200).json({ success: true, publicUrl, path });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "图片上传失败。" });
  }
};
