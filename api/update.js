const { checkAdmin, requireSupabaseEnv } = require("./_auth");
const { supabaseRequest } = require("./_supabase-rest");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const { id, title, intro, topic, body } = data || {};
    if (!id || !title || !body) {
      return res.status(400).json({ success: false, error: "缺少文章 ID、标题或正文" });
    }

    const updatedRows = await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(id)}&select=id,title,slug,intro,body,type,topic,created_at`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        intro: intro || "",
        topic: topic || "未分类",
        body
      })
    });

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到 ID 为 ${id} 的文章，所以没有保存修改`
      });
    }

    return res.status(200).json({ success: true, data: updatedRows[0] });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
