const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { title, intro, body, video, type, topic } = data;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: "title / body 必填"
      });
    }

    const slug = `post-${Date.now()}`;

    // =========================
    // 1. 写 Supabase（唯一数据源）
    // =========================
    const { error } = await supabase.from("contents").insert([
      {
        title,
        intro: intro || "",
        body,
        video: video || "",
        type: type || "article",
        topic: topic || "未分类",
        slug,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      return res.status(500).json({
        step: "supabase_insert",
        error
      });
    }

    // =========================
    // 2. 返回成功（不再 GitHub push，避免卡死）
    // =========================
    return res.status(200).json({
      success: true,
      slug,
      url: `/content.html?slug=${slug}`
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
