const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  console.log("➡️ publish called");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    console.log("📦 INPUT DATA:", data);

    const {
      title,
      intro,
      body,
      video,
      type,
      topic
    } = data;

    // =========================
    // 1️⃣ 必填检查
    // =========================
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: "title / body 必填"
      });
    }

    // =========================
    // 2️⃣ slug（用于前端链接）
    // =========================
    const slug = `post-${Date.now()}`;

    // =========================
    // 3️⃣ 写入 Supabase（唯一数据源）
    // =========================
    const { data: result, error } = await supabase
      .from("contents")
      .insert([
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
      ])
      .select();

    if (error) {
      console.error("❌ SUPABASE ERROR:", error);

      return res.status(500).json({
        success: false,
        step: "supabase_insert",
        error
      });
    }

    // =========================
    // 4️⃣ 返回（前端必须用这个）
    // =========================
    return res.status(200).json({
      success: true,
      message: "发布成功",
      slug,
      url: `/content.html?slug=${slug}`,
      data: result
    });

  } catch (e) {
    console.error("❌ SERVER ERROR:", e);

    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
