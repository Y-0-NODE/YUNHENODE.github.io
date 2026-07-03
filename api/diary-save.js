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

    const entry = body?.entry || {};
    if (!entry.id) {
      return res.status(400).json({ success: false, error: "缺少日记 ID" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const row = {
      id: entry.id,
      title: entry.title || "未命名日记",
      entry_date: entry.date,
      mood: entry.mood || "平静",
      tags: entry.tags || "",
      body: entry.body || "",
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("diary_entries")
      .upsert(row, { onConflict: "id" })
      .select("id,title,entry_date,mood,tags,body,created_at,updated_at");

    if (error) return res.status(500).json({ success: false, error: error.message || error });

    return res.status(200).json({ success: true, data: data?.[0] || row });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
