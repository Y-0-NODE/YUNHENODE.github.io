const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

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

    if (!body?.url || !body?.path) {
      return res.status(400).json({ success: false, error: "缺少作品文件地址" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("media_items")
      .insert({
        title: body?.title || body?.fileName || "未命名作品",
        description: body?.description || "",
        kind: body?.kind === "video" ? "video" : "photo",
        url: body.url,
        path: body.path,
        status: "published"
      })
      .select("id,title,description,kind,url,path,status,created_at");

    if (error) return res.status(500).json({ success: false, error: error.message || error });

    return res.status(200).json({ success: true, data: data?.[0] || null });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
