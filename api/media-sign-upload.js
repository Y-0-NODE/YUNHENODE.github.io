const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { normalizeMediaKind } = require("../lib/media-model");

const BUCKET = "media";
const BUCKET_FILE_LIMIT = 20 * 1024 * 1024;
const MAX_INLINE_BYTES = 2 * 1024 * 1024;
const INLINE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/octet-stream",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-m4a",
  "application/pdf"
];

function safeFileName(name) {
  return String(name || "upload.bin")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function getSupabaseEnv() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

function isJwtKey(key) {
  return String(key || "").split(".").length === 3;
}

async function storageRequest(path, options = {}) {
  const env = getSupabaseEnv();
  const headers = {
    apikey: env.key,
    Authorization: `Bearer ${env.key}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(`${env.url}/storage/v1${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message || data?.error || text || `Supabase Storage HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function ensureBucket() {
  try {
    await storageRequest(`/bucket/${encodeURIComponent(BUCKET)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    await storageRequest("/bucket", {
      method: "POST",
      body: JSON.stringify({
        id: BUCKET,
        name: BUCKET,
        public: true,
        file_size_limit: BUCKET_FILE_LIMIT,
        allowed_mime_types: ALLOWED_MIME_TYPES
      })
    });
    return;
  }

  await storageRequest(`/bucket/${encodeURIComponent(BUCKET)}`, {
    method: "PUT",
    body: JSON.stringify({
      public: true,
      file_size_limit: BUCKET_FILE_LIMIT,
      allowed_mime_types: ALLOWED_MIME_TYPES
    })
  });
}

function publicUrl(path) {
  const env = getSupabaseEnv();
  return `${env.url}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadInlineImage(body) {
  const match = String(body?.dataUrl || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    const error = new Error("没有收到可用的图片数据。");
    error.status = 400;
    throw error;
  }

  const contentType = String(body?.contentType || match[1]).toLowerCase();
  if (!INLINE_IMAGE_TYPES.has(contentType)) {
    const error = new Error("手机图片请使用 JPG、PNG、WebP 或 GIF 格式。");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_INLINE_BYTES) {
    const error = new Error("压缩后的图片仍超过 2MB，请换一张图片。");
    error.status = 413;
    throw error;
  }

  const path = `thought/${Date.now()}-${safeFileName(body?.fileName || "thought-image.jpg")}`;
  const env = getSupabaseEnv();
  const upload = await fetch(
    `${env.url}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        "Content-Type": contentType,
        "x-upsert": "false"
      },
      body: buffer
    }
  );

  if (!upload.ok) {
    const detail = await upload.text();
    throw new Error(detail || "Supabase 图片上传失败。");
  }

  return { path, publicUrl: publicUrl(path) };
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

    const kind = normalizeMediaKind(body?.kind);
    const safeName = safeFileName(body?.fileName);
    const path = `${kind}/${Date.now()}-${safeName}`;

    await ensureBucket();

    if (body?.mode === "inline") {
      const uploaded = await uploadInlineImage(body);
      return res.status(200).json({ success: true, ...uploaded });
    }

    const signed = await storageRequest(`/object/upload/sign/${BUCKET}/${path}`, {
      method: "POST"
    });

    return res.status(200).json({
      success: true,
      bucket: BUCKET,
      path,
      token: signed.token,
      signedUrl: signed.url || signed.signedURL || signed.signedUrl || null,
      publicUrl: publicUrl(path)
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      error: e.message || "申请上传通道失败",
      detail: e.data || null
    });
  }
};
