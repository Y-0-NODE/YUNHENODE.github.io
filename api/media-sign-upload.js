const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

const BUCKET = "media";

function safeFileName(name) {
  return String(name || "upload.bin")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function ensureBucket(supabase) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5368709120 });
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
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await ensureBucket(supabase);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) return res.status(500).json({ success: false, error: error.message || error });

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({
      success: true,
      bucket: BUCKET,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
