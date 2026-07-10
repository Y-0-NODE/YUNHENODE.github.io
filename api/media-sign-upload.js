const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");

const BUCKET = "media";
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
  "video/webm"
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
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (isJwtKey(env.key)) {
    headers.Authorization = `Bearer ${env.key}`;
  }

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
    const message = data?.message || data?.error || text || `Supabase Storage HTTP ${response.status}`;
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
        file_size_limit: 5368709120,
        allowed_mime_types: ALLOWED_MIME_TYPES
      })
    });
    return;
  }

  await storageRequest(`/bucket/${encodeURIComponent(BUCKET)}`, {
    method: "PUT",
    body: JSON.stringify({
      public: true,
      file_size_limit: 5368709120,
      allowed_mime_types: ALLOWED_MIME_TYPES
    })
  });
}

function publicUrl(path) {
  const env = getSupabaseEnv();
  return `${env.url}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
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

    const kind = body?.kind === "video" ? "video" : "photo";
    const safeName = safeFileName(body?.fileName);
    const path = `${kind}/${Date.now()}-${safeName}`;

    await ensureBucket();

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
    return res.status(500).json({
      success: false,
      error: e.message || "申请上传通道失败",
      detail: e.data || null
    });
  }
};
