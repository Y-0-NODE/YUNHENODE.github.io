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

    if (!body?.id) return res.status(400).json({ success: false, error: "缺少日记 ID" });

    await supabaseRequest(`/rest/v1/diary_entries?id=eq.${encodeURIComponent(body.id)}`, {
      method: "DELETE"
    });

    return res.status(200).json({ success: true, id: body.id });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
