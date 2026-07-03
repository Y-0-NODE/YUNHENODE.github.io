const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

const BUCKET = "media";

function safeFileName(name) {
  return String(name || "upload.bin")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

async function ensureBucket(supabase) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  await supabase.storage.createBucket(BUCKET, { public: true });
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

    const parsed = parseDataUrl(body?.dataUrl);
    if (!parsed) return res.status(400).json({ success: false, error: "文件读取失败，请重新选择文件" });

    const kind = body?.kind === "video" ? "video" : "photo";
    const safeName = safeFileName(body?.fileName);
    const path = `${kind}/${Date.now()}-${safeName}`;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await ensureBucket(supabase);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, parsed.buffer, {
        contentType: body?.contentType || parsed.contentType,
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({ success: false, error: uploadError.message || uploadError });
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = publicData.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("media_items")
      .insert({
        title: body?.title || safeName,
        description: body?.description || "",
        kind,
        url,
        path,
        status: "published"
      })
      .select("id,title,description,kind,url,path,status,created_at");

    if (insertError) {
      return res.status(500).json({ success: false, error: insertError.message || insertError });
    }

    return res.status(200).json({ success: true, data: inserted?.[0] || { url, path } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
