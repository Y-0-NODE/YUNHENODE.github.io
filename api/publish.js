const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

function makeSlug(title) {
  return String(title || "content")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .slice(0, 80) + "-" + Date.now();
}

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

    const title = String(data?.title || "").trim();
    const body = String(data?.body || "").trim();

    if (!title || !body) {
      return res.status(400).json({ success: false, error: "标题和正文不能为空" });
    }

    const slug = makeSlug(title);
    const inserted = await supabaseRequest("/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        intro: data?.intro || "",
        body,
        video: data?.video || "",
        type: data?.type || "article",
        topic: data?.topic || "未分类",
        slug,
        created_at: new Date().toISOString()
      })
    });

    return res.status(200).json({
      success: true,
      message: "发布成功",
      slug,
      url: `/content.html?slug=${slug}`,
      data: inserted?.[0] || null
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
