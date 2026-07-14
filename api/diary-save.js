const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

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

    const row = {
      id: entry.id,
      title: entry.title || "未命名日记",
      entry_date: entry.date,
      mood: entry.mood || "平静",
      tags: entry.tags || "",
      body: entry.body || "",
      updated_at: new Date().toISOString()
    };

    const data = await supabaseRequest(
      "/rest/v1/diary_entries?on_conflict=id&select=id,title,entry_date,mood,tags,body,created_at,updated_at",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify(row)
      }
    );

    return res.status(200).json({ success: true, data: data?.[0] || row });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
