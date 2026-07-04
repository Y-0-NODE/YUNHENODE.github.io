const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      version: "diary-list-api-2026-07-04-v1",
      present: {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        YUNHE: Boolean(process.env.YUNHE),
        PUBLISH_PASSWORD: Boolean(process.env.PUBLISH_PASSWORD)
      },
      message: "这是内部日记登录接口检查。看到这个 JSON，说明 api/diary-list 已经部署。"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("diary_entries")
      .select("id,title,entry_date,mood,tags,body,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (error) return res.status(500).json({ success: false, error: error.message || error });

    return res.status(200).json({ success: true, data: data || [] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
