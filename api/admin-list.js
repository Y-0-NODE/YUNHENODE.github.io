const { checkAdmin, requireSupabaseEnv } = require("./_auth");
const { supabaseRequest } = require("./_supabase-rest");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      version: "admin-list-rest-2026-07-04-v1",
      message: "文章管理列表接口已部署。POST 登录后读取 contents 表。"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST allowed"
    });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const contents = await supabaseRequest(
      "/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&type=eq.article&order=created_at.desc"
    );

    return res.status(200).json({
      success: true,
      data: Array.isArray(contents) ? contents : []
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
